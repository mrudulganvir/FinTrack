from datetime import datetime
from pydantic import BaseModel, field_validator
from typing import Literal, Optional
from enum import Enum


class TransactionType(str, Enum):
    income = "income"
    expense = "expense"


class TransactionCreate(BaseModel):
    amount: float
    type: Literal["income", "expense"]
    description: str
    transaction_date: datetime

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Amount must be greater than zero")
        return round(v, 2)

    @field_validator("description")
    @classmethod
    def description_strip(cls, v):
        v = (v or "").strip()
        if not v:
            raise ValueError("Description is required")
        return v


class TransactionResponse(BaseModel):
    id: int
    amount: float
    type: str
    category: Optional[str] = None
    description: Optional[str] = None
    transaction_date: datetime

    class Config:
        from_attributes = True