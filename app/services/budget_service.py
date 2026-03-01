from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from app.database.models import Budget, Transaction


class BudgetService:

    @staticmethod
    def set_budget(db: Session, user_id: int, monthly_limit: float, month: int, year: int):
        existing_budget = db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == month,
            Budget.year == year
        ).first()

        if existing_budget:
            existing_budget.monthly_limit = monthly_limit
            db.commit()
            db.refresh(existing_budget)
            return existing_budget

        new_budget = Budget(
            user_id=user_id,
            monthly_limit=monthly_limit,
            month=month,
            year=year
        )

        db.add(new_budget)
        db.commit()
        db.refresh(new_budget)

        return new_budget

    @staticmethod
    def get_budget_status(db: Session, user_id: int, month: int, year: int):

        budget = db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == month,
            Budget.year == year
        ).first()

        if not budget:
            return None

        total_spent = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            extract('month', Transaction.transaction_date) == month,
            extract('year', Transaction.transaction_date) == year
        ).scalar() or 0

        remaining_budget = budget.monthly_limit - total_spent

        return {
            "monthly_limit": budget.monthly_limit,
            "total_spent": total_spent,
            "remaining_budget": remaining_budget,
            "overspending": remaining_budget < 0
        }