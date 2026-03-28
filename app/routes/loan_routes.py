from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db_connection
from app.database.models import Loan
from app.schemas.loan_schema import LoanCreate, LoanUpdate, LoanResponse
from app.core.security import get_current_user

router = APIRouter(prefix="/loans", tags=["Loans"])


@router.post("/", response_model=LoanResponse)
def create_loan(
    loan: LoanCreate,
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    new_loan = Loan(
        user_id=current_user.id,
        loan_type=loan.loan_type,
        person_name=loan.person_name,
        amount=loan.amount,
        description=loan.description,
        loan_date=loan.loan_date,
        due_date=loan.due_date,
        status="pending",
    )
    db.add(new_loan)
    db.commit()
    db.refresh(new_loan)
    return new_loan


@router.get("/", response_model=List[LoanResponse])
def get_loans(
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    return (
        db.query(Loan)
        .filter(Loan.user_id == current_user.id)
        .order_by(Loan.loan_date.desc())
        .all()
    )


@router.patch("/{loan_id}/status", response_model=LoanResponse)
def update_loan_status(
    loan_id: int,
    update: LoanUpdate,
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    loan = db.query(Loan).filter(
        Loan.id == loan_id, Loan.user_id == current_user.id
    ).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    loan.status = update.status
    db.commit()
    db.refresh(loan)
    return loan


@router.delete("/{loan_id}")
def delete_loan(
    loan_id: int,
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    loan = db.query(Loan).filter(
        Loan.id == loan_id, Loan.user_id == current_user.id
    ).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    db.delete(loan)
    db.commit()
    return {"message": "Loan deleted"}