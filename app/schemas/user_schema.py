from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: Optional[str] = None
    email: EmailStr
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class SignupResponse(BaseModel):
    """
    Returned by POST /auth/signup.
    Includes an access_token so the client can skip a separate login call
    and immediately proceed to the onboarding flow.
    """
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    model_config = {
        "from_attributes": True
    }
