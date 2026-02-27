from pydantic import BaseModel
from datetime import datetime
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
    type: TransactionType
    category: Optional[str]
    description: Optional[str]
    transaction_date: datetime
    created_at: datetime

    class Config:
        orm_mode = True