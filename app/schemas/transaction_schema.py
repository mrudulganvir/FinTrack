from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from enum import Enum


class TransactionType(str, Enum):
    income = "income"
    expense = "expense"


class TransactionCreate(BaseModel):
    amount: float
    type: TransactionType
    category: Optional[str] = None
    description: Optional[str] = None
    transaction_date: datetime


class TransactionResponse(BaseModel):
    id: int
    amount: float
    type: str
    category: str | None = None
    description: str | None = None
    transaction_date: datetime

    class Config:
        from_attributes = True 