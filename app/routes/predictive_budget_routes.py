"""
predictive_budget_routes.py

Endpoint: GET /budgets/predict?month=4&year=2026

Returns ML-driven projection + in-app notification payloads.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.database.db import get_db_connection
from app.database.models import Transaction, Budget
from app.core.security import get_current_user
from app.services.predictive_budget_service import generate_predictive_alerts

router = APIRouter(prefix="/budgets", tags=["Predictive Budget Alerts"])


@router.get("/predict")
def get_predictive_budget_alert(
    month: int = Query(default=None, ge=1, le=12, description="Month (1–12). Defaults to current month."),
    year:  int = Query(default=None, ge=2000, le=2100, description="Year. Defaults to current year."),
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    now = datetime.now()
    if month is None:
        month = now.month
    if year is None:
        year = now.year

    # Fetch budget for this month
    budget = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month == month,
        Budget.year == year,
    ).first()

    budget_limit = budget.monthly_limit if budget else None

    # Fetch all transactions for this user
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .all()
    )

    result = generate_predictive_alerts(transactions, budget_limit, month, year)
    return result