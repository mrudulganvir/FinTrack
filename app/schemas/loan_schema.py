from datetime import datetime
from typing import Optional
from app.database.models import LoanStatus, LoanType
from pydantic import BaseModel


class LoanCreate(BaseModel):
    loan_type: LoanType
    person_name: str
    amount: float
    description: Optional[str] = None
    loan_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    
class LoanResponse(LoanCreate):
    id: int
    status: LoanStatus
    created_at: datetime

    class Config:
        orm_mode = True
        
class LoanUpdate(BaseModel):
    status: LoanStatus  
      