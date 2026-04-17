from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.db import get_db_connection
from app.database.models import User
from app.schemas.user_schema import UserCreate, UserLogin, UserResponse, SignupResponse
from app.core.security import hash_password, verify_password, create_access_token
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
import os
import re
import secrets

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

router = APIRouter(prefix="/auth", tags=["Authentication"])

class BiometricLoginRequest(BaseModel):
    email: str
    credential_id: str
    signature: str  # Simulated/Real signature payload
    challenge: str


def _normalise_phone(phone: str) -> str:
    """Strip formatting; prepend +91 for bare 10-digit Indian numbers."""
    cleaned = re.sub(r"[\s\-\(\)]", "", phone or "")
    if cleaned and not cleaned.startswith("+") and len(cleaned) == 10:
        cleaned = "+91" + cleaned
    return cleaned


@router.post("/signup", response_model=SignupResponse)
def signup(user: UserCreate, db: Session = Depends(get_db_connection)):
    try:
        existing = db.query(User).filter(User.email == user.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        new_user = User(
            name=user.name,
            email=user.email,
            phone=_normalise_phone(user.phone),
            hashed_password=hash_password(user.password),
            # kyc_status and is_onboarded default to 'pending' / False in the model
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Issue a JWT immediately — client uses it to call onboarding endpoints
        access_token = create_access_token({"user_id": new_user.id, "name": new_user.name})

        return SignupResponse(
            access_token=access_token,
            token_type="bearer",
            user=new_user,
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"DEBUG: Signup Error: {e}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db_connection),
):
    db_user = db.query(User).filter(User.email == form_data.username).first()

    if not db_user or not db_user.hashed_password or \
            not verify_password(form_data.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"user_id": db_user.id, "name": db_user.name})
    return {"access_token": access_token, "token_type": "bearer"}


class GoogleTokenRequest(BaseModel):
    id_token: str


@router.post("/google")
def google_login(payload: GoogleTokenRequest, db: Session = Depends(get_db_connection)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google auth not configured — set GOOGLE_CLIENT_ID in .env",
        )

    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError as e:
        print(f"DEBUG: Google ValueError: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except Exception as e:
        print(f"DEBUG: Google Error: {e}")
        raise HTTPException(status_code=401, detail=f"Google verification failed: {str(e)}")

    if not idinfo.get("email_verified"):
        raise HTTPException(status_code=400, detail="Google account email is not verified")

    email = idinfo["email"]
    google_name = idinfo.get("name", "")
    is_new_user = False

    db_user = db.query(User).filter(User.email == email).first()
    if not db_user:
        is_new_user = True
        db_user = User(
            name=google_name,
            email=email,
            phone="",
            hashed_password=hash_password(secrets.token_urlsafe(48)),
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    elif not db_user.name and google_name:
        db_user.name = google_name
        db.commit()

    access_token = create_access_token({"user_id": db_user.id, "name": db_user.name})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        # Tell the frontend whether this is a brand-new account so it can
        # redirect to /onboarding instead of /dashboard
        "is_new_user": is_new_user,
        "is_onboarded": db_user.is_onboarded,
    }

@router.post("/biometric-challenge")
def get_biometric_challenge(payload: dict, db: Session = Depends(get_db_connection)):
    email = payload.get("email")
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.biometric_enabled:
        raise HTTPException(status_code=400, detail="Biometrics not enabled for this account")
    
    # Generate a random challenge (in production, store this in session/redis)
    challenge = secrets.token_urlsafe(32)
    return {
        "challenge": challenge,
        "biometric_type": user.biometric_type,
        "allowCredentials": [{
            "type": "public-key",
            "id": user.biometric_credential_id
        }]
    }

@router.post("/biometric-login")
def biometric_login(payload: BiometricLoginRequest, db: Session = Depends(get_db_connection)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.biometric_enabled:
        raise HTTPException(status_code=401, detail="Biometric login not available")

    # VERIFICATION LOGIC
    # In a real app, you would use 'pywebauthn' to verify 'payload.signature' 
    # against 'user.biometric_public_key' and the original 'challenge'.
    
    # Simulation: Verify that the credentialId matches our records
    if payload.credential_id != user.biometric_credential_id:
        raise HTTPException(status_code=401, detail="Hardware signature mismatch")

    access_token = create_access_token({"user_id": user.id, "name": user.name})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "is_onboarded": user.is_onboarded
    }
