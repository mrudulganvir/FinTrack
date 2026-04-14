from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Index, Integer, String, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base
from datetime import datetime
import enum
 
 
# ── Enums ──────────────────────────────────────────────────────────────────────
 
class TransactionType(str, enum.Enum):
    income  = "income"
    expense = "expense"
 
 
class LoanType(str, enum.Enum):
    lent     = "lent"
    borrowed = "borrowed"
 
 
class LoanStatus(str, enum.Enum):
    pending  = "pending"
    settled  = "settled"
    overdue  = "overdue"
 
 
# ── ORM Models ─────────────────────────────────────────────────────────────────
 
class SignupRequest(Base):
    __tablename__ = "signup_requests"
 
    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String(255), nullable=False, unique=True)
    phone      = Column(String(20),  nullable=False)
    password   = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
 
 
class User(Base):
    __tablename__ = "users"
 
    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(255), nullable=False, unique=True)
    phone           = Column(String,      nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
 
    transactions          = relationship("Transaction",      back_populates="user", cascade="all, delete-orphan")
    budgets               = relationship("Budget",           back_populates="user")
    loans                 = relationship("Loan",             back_populates="user", cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
 
 
class Transaction(Base):
    __tablename__ = "transactions"
 
    id               = Column(Integer,        primary_key=True)
    user_id          = Column(Integer,        ForeignKey("users.id"))
    amount           = Column(Float(precision=2), nullable=False)
    type             = Column(String)
    category         = Column(String(100),    nullable=True)
    description      = Column(String(255),    nullable=True)
    transaction_date = Column(DateTime,       nullable=False, default=datetime.utcnow)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
 
    user = relationship("User", back_populates="transactions")
 
 
class Budget(Base):
    __tablename__ = "budgets"
 
    id            = Column(Integer,          primary_key=True)
    user_id       = Column(Integer,          ForeignKey("users.id"), nullable=False)
    monthly_limit = Column(Float(precision=2), nullable=False)
    month         = Column(Integer,          nullable=False)
    year          = Column(Integer,          nullable=False)
 
    user = relationship("User", back_populates="budgets")
 
    __table_args__ = (
        UniqueConstraint("user_id", "month", "year", name="unique_user_month_budget"),
    )
 
 
class Loan(Base):
    __tablename__ = "loans"
 
    id          = Column(Integer,        primary_key=True, index=True)
    user_id     = Column(Integer,        ForeignKey("users.id"), nullable=False)
    loan_type   = Column(String(20),     nullable=False)
    person_name = Column(String(255),    nullable=False)
    amount      = Column(Float(precision=2), nullable=False)
    description = Column(String(500),    nullable=True)
    loan_date   = Column(DateTime,       nullable=False, default=datetime.utcnow)
    due_date    = Column(DateTime,       nullable=True)
    status      = Column(String(20),     nullable=False, default="pending")
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
 
    user = relationship("User", back_populates="loans")
 
 
class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
 
    id               = Column(Integer,   primary_key=True, index=True)
    user_id          = Column(Integer,   ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
 
    otp_hash         = Column(String(64), nullable=False)
    reset_token_hash = Column(String(64), nullable=False, default="")
 
    channel          = Column(String(10), nullable=False, default="sms")
    phone            = Column(String(20), nullable=True)
 
    created_at       = Column(DateTime,  default=datetime.utcnow, nullable=False)
    expires_at       = Column(DateTime,  nullable=False)
 
    otp_verified     = Column(Boolean,   default=False, nullable=False)
    used             = Column(Boolean,   default=False, nullable=False)
    attempt_count    = Column(Integer,   default=0,     nullable=False)
 
    user = relationship("User", back_populates="password_reset_tokens")
 
    __table_args__ = (
        Index("ix_prt_user_active", "user_id", "used", "otp_verified"),
    )

# ── Request / Response schemas ─────────────────────────────────────────────────
from pydantic import BaseModel, EmailStr, field_validator

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    phone: str
 
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("+"):
            raise ValueError("Phone must include country code (e.g. +91...)")
        if not v[1:].isdigit():
            raise ValueError("Invalid phone number — digits only after the +")
        return v
 
 
class ForgotPasswordResponse(BaseModel):
    message: str
 
 
class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp:   str
 
    @field_validator("otp")
    @classmethod
    def otp_must_be_six_digits(cls, v: str) -> str:
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
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v
 
 
class ResetPasswordResponse(BaseModel):
    message: str