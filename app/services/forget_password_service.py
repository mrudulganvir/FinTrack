import os
import secrets
import hashlib
import logging
from datetime import datetime, timedelta
 
from fastapi import HTTPException
from sqlalchemy.orm import Session
 
from app.database.models import User, PasswordResetToken
from app.core.security import hash_password
 
logger = logging.getLogger(__name__)
 
# ── Config (override via environment variables) ────────────────────────────────
OTP_TTL_MINUTES      = int(os.getenv("OTP_TTL_MINUTES",       "10"))
TOKEN_TTL_MINUTES    = int(os.getenv("TOKEN_TTL_MINUTES",     "15"))
RATE_LIMIT_MAX       = int(os.getenv("OTP_RATE_LIMIT_MAX",     "3"))   # requests per window
RATE_LIMIT_WINDOW    = int(os.getenv("OTP_RATE_LIMIT_WINDOW", "10"))   # minutes
MAX_OTP_ATTEMPTS     = int(os.getenv("OTP_MAX_ATTEMPTS",        "5"))
OTP_LENGTH           = 6
DEV_MODE             = os.getenv("APP_ENV", "production").lower() == "development"
 
 
# ── Pure helpers (no DB, no HTTP) ──────────────────────────────────────────────
 
def _normalise_phone(phone: str) -> str:
    """
    Ensure E.164 format (+91XXXXXXXXXX).
    The frontend already sends +91…; this is a safety net for other callers.
    """
    phone = phone.strip()
    if not phone.startswith("+"):
        phone = "+91" + phone
    return phone
 
 
def _generate_otp() -> str:
    """
    secrets.randbelow() uses OS entropy (CSPRNG).
    random.choices() is seeded and predictable — never use it for auth codes.
    """
    return str(secrets.randbelow(10 ** OTP_LENGTH)).zfill(OTP_LENGTH)
 
 
def _generate_reset_token() -> str:
    return secrets.token_urlsafe(32)
 
 
def _hash_value(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()
 
 
# ── DB helpers ─────────────────────────────────────────────────────────────────
 
def _cleanup_expired(db: Session, user_id: int) -> None:
    """
    Delete expired/used tokens so the table doesn't grow unbounded.
    Called on every request_otp() to keep the table lean.
    """
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user_id,
        (PasswordResetToken.used == True) |
        (PasswordResetToken.expires_at < datetime.utcnow())
    ).delete(synchronize_session=False)
    db.commit()
 
 
# ── SMS helper (defined BEFORE request_otp which calls it) ────────────────────
 
def _send_otp_sms(phone: str, otp: str) -> None:
    """
    Send the OTP via Twilio SMS.
 
    Dev mode: if Twilio creds are absent, logs the OTP instead of crashing.
              Set APP_ENV=development in your .env to activate this.
    Prod mode: missing creds → 502; Twilio error → 502.
 
    Twilio trial accounts: SMS only reaches numbers verified in the Twilio console.
    Upgrade to a paid account or switch to Twilio Verify API for unrestricted delivery.
    """
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token  = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM_NUMBER")
 
    if not all([account_sid, auth_token, from_number]):
        if DEV_MODE:
            logger.warning("DEV MODE — Twilio not configured. OTP for %s: %s", phone, otp)
            return
        else:
            logger.error("Twilio credentials missing in production!")
            raise HTTPException(status_code=502, detail="SMS service unavailable.")
 
    try:
        from twilio.rest import Client
        client  = Client(account_sid, auth_token)
        message = client.messages.create(
            body    = f"FinTrack: Your OTP is {otp}. Valid for {OTP_TTL_MINUTES} mins. Do not share.",
            from_   = from_number,
            to      = phone,
        )
        logger.info("OTP SMS sent to %s, SID=%s", phone, message.sid)
 
    except Exception as exc:
        logger.error("Twilio error for %s: %s", phone, exc)
        raise HTTPException(status_code=502, detail="SMS delivery failed. Please try again.")
 
 
# ── Service functions ──────────────────────────────────────────────────────────
 
def request_otp(db: Session, email: str, phone: str) -> None:
    """
    Step 1 of the forgot-password flow.
 
    Security notes:
    - Always returns None silently — never reveals whether the account exists.
    - Rate-limited to RATE_LIMIT_MAX requests per RATE_LIMIT_WINDOW minutes.
    - Invalidates all previous unused OTPs for this user before creating a new one.
    - Cleans up old/expired tokens on every call.
    """
    phone = _normalise_phone(phone)
 
    user = db.query(User).filter(
        User.email == email,
        User.phone == phone,
    ).first()
 
    if not user:
        # Silent return prevents user enumeration.
        # Attackers cannot distinguish "no account" from "OTP sent".
        logger.warning("OTP requested for unknown email=%s phone=%s", email, phone)
        return
 
    _cleanup_expired(db, user.id)
 
    # ── Rate limiting ──────────────────────────────────────────────────────────
    # Prevents OTP bombing (flooding a victim's phone) and Twilio cost abuse.
    window_start = datetime.utcnow() - timedelta(minutes=RATE_LIMIT_WINDOW)
    recent_count = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id    == user.id,
        PasswordResetToken.created_at >= window_start,
    ).count()
 
    if recent_count >= RATE_LIMIT_MAX:
        logger.warning("Rate limit hit for user_id=%s", user.id)
        return  # silent — same response as "user not found"
 
    # ── Invalidate all old active OTPs ────────────────────────────────────────
    # Ensures only the most recently issued OTP is valid.
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used    == False,
    ).update({"used": True})
    db.commit()
 
    otp = _generate_otp()
 
    new_record = PasswordResetToken(
        user_id          = user.id,
        otp_hash         = _hash_value(otp),
        reset_token_hash = "",          # populated only after OTP is verified
        channel          = "sms",
        phone            = phone,
        expires_at       = datetime.utcnow() + timedelta(minutes=OTP_TTL_MINUTES),
        attempt_count    = 0,
    )
    db.add(new_record)
    db.commit()
 
    # _send_otp_sms is defined above — call is safe
    _send_otp_sms(phone, otp)
 
 
def verify_otp(db: Session, email: str, otp: str) -> str:
    """
    Step 2: verify the OTP.
    - Max MAX_OTP_ATTEMPTS wrong tries before the token is locked.
    - Returns a short-lived reset_token on success.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid OTP.")
 
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id      == user.id,
        PasswordResetToken.used         == False,
        PasswordResetToken.otp_verified == False,
        PasswordResetToken.expires_at   >  datetime.utcnow(),
    ).order_by(PasswordResetToken.id.desc()).first()
 
    if not record:
        raise HTTPException(status_code=400, detail="OTP expired or not found. Please request a new one.")
 
    # ── Brute-force guard ──────────────────────────────────────────────────────
    if record.attempt_count >= MAX_OTP_ATTEMPTS:
        record.used = True
        db.commit()
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect attempts. Please request a new OTP."
        )
 
    if record.otp_hash != _hash_value(otp):
        record.attempt_count = (record.attempt_count or 0) + 1
        db.commit()
        remaining = MAX_OTP_ATTEMPTS - record.attempt_count
        raise HTTPException(
            status_code=400,
            detail=f"Invalid OTP. {remaining} attempt(s) remaining."
        )
 
    # ── OTP correct — issue reset token ───────────────────────────────────────
    reset_token = _generate_reset_token()
    record.otp_verified      = True
    record.reset_token_hash  = _hash_value(reset_token)
    record.expires_at        = datetime.utcnow() + timedelta(minutes=TOKEN_TTL_MINUTES)
    db.commit()
 
    logger.info("OTP verified for user_id=%s", user.id)
    return reset_token
 
 
def reset_password(db: Session, email: str, reset_token: str, new_password: str) -> None:
    """
    Step 3: set the new password.
    - Validates the reset_token hash (issued only after OTP was verified).
    - Marks the record used=True immediately to prevent replay attacks.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
 
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id      == user.id,
        PasswordResetToken.used         == False,
        PasswordResetToken.otp_verified == True,
        PasswordResetToken.expires_at   >  datetime.utcnow(),
    ).order_by(PasswordResetToken.id.desc()).first()
 
    if not record or record.reset_token_hash != _hash_value(reset_token):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
 
    user.hashed_password = hash_password(new_password)
    record.used = True      # single-use: prevents replay
    db.commit()
 
    logger.info("Password reset successfully for user_id=%s", user.id)