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

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

router = APIRouter(prefix="/auth", tags=["Authentication"])


class GoogleTokenRequest(BaseModel):
    id_token: str


@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db_connection)):

    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=user.email,
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

    access_token = create_access_token({"user_id": db_user.id})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/google")
def google_login(payload: GoogleTokenRequest, db: Session = Depends(get_db_connection)):
    """Authenticate via Google Sign-In. Verifies the ID token, creates or
    finds the user, and returns a JWT access token."""
    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = idinfo.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    # Find or create user
    db_user = db.query(User).filter(User.email == email).first()
    if not db_user:
        db_user = User(email=email, hashed_password=None)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    access_token = create_access_token({"user_id": db_user.id})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }