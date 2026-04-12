from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from app.database.db import get_db_connection
from app.services.forget_password_service import (
    request_otp,
    verify_otp,
    reset_password,
)

router = APIRouter(prefix="/auth", tags=["Forgot Password"])


# ── Request / Response schemas ─────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    phone: str              # e.g. +919876543210  — OTP sent via SMS

    @field_validator("phone")
    @classmethod
    def phone_must_have_country_code(cls, v):
        v = v.strip()
        if not v.startswith("+"):
            raise ValueError("Phone number must include country code, e.g. +919876543210")
        if not v[1:].isdigit():
            raise ValueError("Phone number must contain only digits after the + sign")
        if len(v) < 10:
            raise ValueError("Phone number is too short")
        return v


class ForgotPasswordResponse(BaseModel):
    message: str


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp:   str

    @field_validator("otp")
    @classmethod
    def otp_must_be_six_digits(cls, v):
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be exactly 6 digits")
        return v


class VerifyOtpResponse(BaseModel):
    message:     str
    reset_token: str


class ResetPasswordRequest(BaseModel):
    email:        EmailStr
    reset_token:  str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class ResetPasswordResponse(BaseModel):
    message: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    summary="Request a password-reset OTP via SMS",
    description=(
        "Generates a 6-digit OTP and sends it to the provided phone number "
        "via Twilio SMS. Always returns HTTP 200 even if the email is not "
        "registered — prevents user enumeration."
    ),
)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db_connection),
):
    request_otp(
        db    = db,
        email = str(payload.email),
        phone = payload.phone,
    )
    return ForgotPasswordResponse(
        message=f"If that account exists, an OTP has been sent to {payload.phone}."
    )


@router.post(
    "/verify-otp",
    response_model=VerifyOtpResponse,
    summary="Verify the OTP and receive a reset token",
    description=(
        "Validates the 6-digit OTP received via SMS. "
        "On success returns a short-lived reset_token to use in /auth/reset-password."
    ),
)
def verify_otp_endpoint(
    payload: VerifyOtpRequest,
    db: Session = Depends(get_db_connection),
):
    token = verify_otp(
        db    = db,
        email = str(payload.email),
        otp   = payload.otp,
    )
    return VerifyOtpResponse(
        message     = "OTP verified. Proceed to reset your password.",
        reset_token = token,
    )


@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
    summary="Reset password using a verified reset token",
    description=(
        "Updates the user's password. The reset_token must come from a "
        "successful /auth/verify-otp call and must not have been used before."
    ),
)
def reset_password_endpoint(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db_connection),
):
    reset_password(
        db           = db,
        email        = str(payload.email),
        reset_token  = payload.reset_token,
        new_password = payload.new_password,
    )
    return ResetPasswordResponse(
        message="Password has been reset successfully. You can now sign in."
    )