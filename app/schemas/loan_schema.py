from datetime import datetime
from typing import Optional
from app.database.models import LoanStatus, LoanType
from pydantic import BaseModel


class LoanCreate(BaseModel):
    loan_type: str
    person_name: str
    amount: float
    description: Optional[str] = None
    loan_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    
class LoanResponse(LoanCreate):
    id: int
    status: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }
        
class LoanUpdate(BaseModel):
    status: LoanStatus  
      