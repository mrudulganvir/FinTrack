from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db_connection
from app.database.models import Budget
from app.schemas.budget_schema import BudgetCreate, BudgetStatusResponse
from app.services.budget_service import BudgetService
from app.core.security import get_current_user

router = APIRouter(
    prefix="/budgets",
    tags=["Budgets"]
)

@router.post("/")
def set_budget(
    budget_data: BudgetCreate,
    db: Session = Depends(get_db_connection),
    current_user = Depends(get_current_user)
):
    return BudgetService.set_budget(
        db=db,
        user_id=current_user.id,
        monthly_limit=budget_data.monthly_limit,
        month=budget_data.month,
        year=budget_data.year
    )
    
@router.get("/status", response_model=BudgetStatusResponse)
def get_budget_status(
    month: int,
    year: int,
    db: Session = Depends(get_db_connection),
    current_user = Depends(get_current_user)
):
    result = BudgetService.get_budget_status(
        db=db,
        user_id=current_user.id,
        month=month,
        year=year
    )

    if not result:
        raise HTTPException(status_code=404, detail="Budget not set for this month")

    return result