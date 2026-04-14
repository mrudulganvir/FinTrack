from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.db import get_db_connection
from app.database.models import User
from app.schemas.user_schema import UserCreate, UserLogin, UserResponse
from app.core.security import hash_password, verify_password, create_access_token
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
import os
import secrets

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

router = APIRouter(prefix="/auth", tags=["Authentication"])


class GoogleTokenRequest(BaseModel):
    id_token: str


from app.services.forget_password_service import _normalise_phone

@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db_connection)):

    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        name=user.name,
        email=user.email,
        phone=_normalise_phone(user.phone),
        hashed_password=hash_password(user.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db_connection)
):
    db_user = db.query(User).filter(User.email == form_data.username).first()

    if not db_user or not db_user.hashed_password or not verify_password(form_data.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"user_id": db_user.id, "name": db_user.name})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/google")
def google_login(payload: GoogleTokenRequest, db: Session = Depends(get_db_connection)):
    """Authenticate via Google Sign-In. Verifies the ID token, creates or
    finds the user, and returns a JWT access token."""

    # Guard: GOOGLE_CLIENT_ID must be set as an env var on the server
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google auth not configured on server — set GOOGLE_CLIENT_ID env var in Render"
        )

    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError as e:
        # Token is malformed, expired, wrong audience, or bad signature
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except Exception as e:
        # Network/transport errors fetching Google's public certs
        raise HTTPException(status_code=401, detail=f"Google verification failed: {str(e)}")

    # Reject accounts where Google hasn't confirmed the email
    if not idinfo.get("email_verified"):
        raise HTTPException(status_code=400, detail="Google account email is not verified")

    email = idinfo.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")
        
    google_name = idinfo.get("name")

    # Find or create user
    db_user = db.query(User).filter(User.email == email).first()
    if not db_user:
        # Generate a random unusable password so the DB NOT NULL constraint is satisfied.
        # This password is unguessable — Google users can only sign in via Google.
        random_pw = secrets.token_urlsafe(48)
        db_user = User(name=google_name, email=email, phone="", hashed_password=hash_password(random_pw))
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    elif not db_user.name and google_name:
        db_user.name = google_name
        db.commit()

    access_token = create_access_token({"user_id": db_user.id, "name": db_user.name})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }