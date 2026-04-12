import os
import random
import string
import secrets
import hashlib
import logging
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.database.models import User, PasswordResetToken
from app.core.security import hash_password

logger = logging.getLogger(__name__)

# ── Tunables ──────────────────────────────────────────────────────────────────
OTP_TTL_MINUTES   = int(os.getenv("OTP_TTL_MINUTES",   "10"))
TOKEN_TTL_MINUTES = int(os.getenv("TOKEN_TTL_MINUTES", "15"))
OTP_LENGTH        = 6

# Twilio credentials — loaded from .env
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN  = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER")   # +16624904673


# ── Internal helpers ──────────────────────────────────────────────────────────

def _generate_otp() -> str:
    """Return a zero-padded numeric OTP of OTP_LENGTH digits."""
    return "".join(random.choices(string.digits, k=OTP_LENGTH))


def _generate_reset_token() -> str:
    """Return a cryptographically random URL-safe token."""
    return secrets.token_urlsafe(32)


def _hash_value(value: str) -> str:
    """SHA-256 hash — OTP and reset-token are never stored in plaintext."""
    return hashlib.sha256(value.encode()).hexdigest()


def _send_sms(to_phone: str, otp: str) -> None:
    """
    Send the 6-digit OTP via Twilio SMS.

    Reads from .env:
      TWILIO_ACCOUNT_SID  — your Twilio Account SID
      TWILIO_AUTH_TOKEN   — your Twilio Auth Token
      TWILIO_FROM_NUMBER  — your Twilio phone number

    Install: pip install twilio
    """
    if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER]):
        logger.warning(
            "Twilio env vars not set — skipping SMS delivery. OTP: %s", otp
        )
        return

    try:
        from twilio.rest import Client

        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=(
                f"FinTrack: Your password reset OTP is {otp}. "
                f"Valid for {OTP_TTL_MINUTES} minutes. Do not share it."
            ),
            from_=TWILIO_FROM_NUMBER,
            to=to_phone,
        )
        logger.info("OTP SMS sent to %s", to_phone)

    except ImportError:
        logger.error("twilio package not installed. Run: pip install twilio")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SMS service not configured. Contact support.",
        )
    except Exception as exc:
        logger.error("Twilio SMS delivery failed for %s: %s", to_phone, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send OTP SMS. Please try again later.",
        )


# ── Public service functions ──────────────────────────────────────────────────

def request_otp(
    db:    Session,
    email: str,
    phone: str,            # always required — SMS only
) -> None:
    """
    Step 1 — generate OTP, persist it, send via SMS to the given phone number.
    Silently succeeds if the email is not found (prevents user enumeration).
    """
    if not phone:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A phone number is required to receive the OTP.",
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        logger.info("OTP requested for unknown email: %s", email)
        return   # silently succeed — don't reveal whether the email exists

    # Invalidate all previous un-used tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used    == False,        # noqa: E712
    ).update({"used": True})
    db.flush()

    otp         = _generate_otp()
    reset_token = _generate_reset_token()
    expires_at  = datetime.utcnow() + timedelta(minutes=OTP_TTL_MINUTES)

    record = PasswordResetToken(
        user_id          = user.id,
        otp_hash         = _hash_value(otp),
        reset_token_hash = _hash_value(reset_token),
        channel          = "sms",
        phone            = phone,
        expires_at       = expires_at,
        otp_verified     = False,
        used             = False,
    )
    db.add(record)
    db.commit()

    _send_sms(phone, otp)


def verify_otp(db: Session, email: str, otp: str) -> str:
    """
    Step 2 — verify the OTP, return a fresh reset_token for step 3.
    Raises HTTPException if the OTP is wrong or expired.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )

    record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id      == user.id,
            PasswordResetToken.used         == False,        # noqa: E712
            PasswordResetToken.otp_verified == False,        # noqa: E712
            PasswordResetToken.expires_at   >  datetime.utcnow(),
        )
        .order_by(PasswordResetToken.id.desc())
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )

    if record.otp_hash != _hash_value(otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )

    # Mark OTP verified; extend window for the password-reset step
    record.otp_verified = True
    record.expires_at   = datetime.utcnow() + timedelta(minutes=TOKEN_TTL_MINUTES)
    db.commit()

    # Issue a brand-new reset token so the old one can never be reused
    new_reset_token         = _generate_reset_token()
    record.reset_token_hash = _hash_value(new_reset_token)
    db.commit()

    return new_reset_token


def reset_password(
    db:           Session,
    email:        str,
    reset_token:  str,
    new_password: str,
) -> None:
    """
    Step 3 — validate reset_token, update the password, burn the token.
    Raises HTTPException on invalid/expired token or password too short.
    """
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 6 characters.",
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id      == user.id,
            PasswordResetToken.used         == False,        # noqa: E712
            PasswordResetToken.otp_verified == True,         # noqa: E712
            PasswordResetToken.expires_at   >  datetime.utcnow(),
        )
        .order_by(PasswordResetToken.id.desc())
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    if record.reset_token_hash != _hash_value(reset_token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    user.hashed_password = hash_password(new_password)
    record.used          = True

    db.commit()
    logger.info("Password reset successfully for user %s", user.id)