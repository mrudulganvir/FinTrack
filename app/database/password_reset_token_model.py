from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship

from app.database.db import Base       


class PasswordResetToken(Base):

    __tablename__ = "password_reset_tokens"

    id               = Column(Integer, primary_key=True, index=True)

    user_id          = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    otp_hash         = Column(String(64), nullable=False)

    reset_token_hash = Column(String(64), nullable=False)

    channel          = Column(String(10), nullable=False, default="email")   # "email" | "sms"
    phone            = Column(String(20), nullable=True)                     # only set when channel="sms"

    created_at       = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at       = Column(DateTime, nullable=False)

    otp_verified     = Column(Boolean, default=False, nullable=False)
    used             = Column(Boolean, default=False,  nullable=False)

    user             = relationship("User", back_populates="password_reset_tokens")

    __table_args__ = (
        Index("ix_prt_user_active", "user_id", "used", "otp_verified"),
    )

    def __repr__(self) -> str:
        return (
            f"<PasswordResetToken id={self.id} user_id={self.user_id} "
            f"channel={self.channel} verified={self.otp_verified} used={self.used}>"
        )

