from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base
from datetime import datetime
import enum


class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"


class LoanType(str, enum.Enum):
    lent = "lent"       
    borrowed = "borrowed"  


class LoanStatus(str, enum.Enum):
    pending = "pending"
    settled = "settled"
    overdue = "overdue"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user")
    loans = relationship("Loan", back_populates="user", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float(precision=2), nullable=False)
    type = Column(String)
    category = Column(String(100), nullable=True)
    description = Column(String(255), nullable=True)
    transaction_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="transactions")


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    monthly_limit = Column(Float(precision=2), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)

    user = relationship("User", back_populates="budgets")

    __table_args__ = (
        UniqueConstraint("user_id", "month", "year", name="unique_user_month_budget"),
    )


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    loan_type = Column(String(20), nullable=False)
    person_name = Column(String(255), nullable=False)
    amount = Column(Float(precision=2), nullable=False)
    description = Column(String(500), nullable=True)
    loan_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=False, default="pending")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="loans")