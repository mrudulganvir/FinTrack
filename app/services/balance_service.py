from sqlalchemy.orm import Session
from app.database.models import Transaction
from sqlalchemy import func

def calculate_balance(db: Session, user_id: int):
    total_income = (
        db.query(func.sum(Transaction.amount))
        .filter(Transaction.user_id == user_id)
        .filter(Transaction.type == "income")
        .scalar()
    ) or 0

    total_expense = (
        db.query(func.sum(Transaction.amount))
        .filter(Transaction.user_id == user_id)
        .filter(Transaction.type == "expense")
        .scalar()
    ) or 0

    return total_income - total_expense