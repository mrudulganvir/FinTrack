from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.db import get_db_connection
from app.database.models import Transaction, LinkedAccount
from app.core.security import get_current_user
from app.services.advisor_service import advisor_service
from typing import Optional

router = APIRouter(prefix="/advisor", tags=["Investment Advisor"])

@router.get("/suggest")
def get_investment_suggestion(
    risk_appetite: str = Query(..., description="conservative, moderate, or aggressive"),
    db: Session = Depends(get_db_connection),
    current_user = Depends(get_current_user)
):
    """
    Returns personalized investment suggestions based on 
    real-time market data (yfinance) and user's monthly savings.
    """
    # 1. Calculate Monthly Surplus (Savings)
    # We look at the last 30 days of internal transactions
    txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    income = sum(t.amount for t in txs if t.type == "income")
    expense = sum(t.amount for t in txs if t.type == "expense")
    
    # Add external account balances context? 
    # For now, we focus on 'Flow' (Income - Expense)
    surplus = max(0, income - expense)
    
    # If no internal transactions, look at external balance as a fallbag or baseline
    if surplus == 0:
        ext_accounts = db.query(LinkedAccount).filter(LinkedAccount.user_id == current_user.id).all()
        ext_balance = sum(acc.balance for acc in ext_accounts)
        # Suggest based on 10% of total liquid cash if no monthly income context
        surplus = ext_balance * 0.1 

    # 2. Get Analysis from Advisor Service
    suggestion = advisor_service.suggest_strategy(surplus, risk_appetite)
    
    return suggestion
