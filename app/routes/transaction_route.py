from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db_connection
from app.database.models import Transaction
from app.schemas.transaction_schema import TransactionCreate, TransactionResponse
from app.services.balance_service import calculate_balance
from app.core.security import get_current_user

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.post("/", response_model=dict)
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db_connection),
    current_user = Depends(get_current_user)
):
    new_transaction = Transaction(
        amount=transaction.amount,
        type=transaction.type,
        category=transaction.category,
        description=transaction.description,
        user_id=current_user.id,
    )

    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    balance = calculate_balance(db, current_user.id)

    return {
        "message": "Transaction added successfully",
        "transaction": TransactionResponse.model_validate(new_transaction),
        "current_balance": balance
    }
    
@router.get("/")
def get_transactions(
    db: Session = Depends(get_db_connection),
    current_user = Depends(get_current_user)
):
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.transaction_date.desc())
        .all()
    )

    balance = calculate_balance(db, current_user.id)

    return {
        "transactions": [
            TransactionResponse.model_validate(tx)
            for tx in transactions
        ],
        "current_balance": balance
    }
    
@router.get("/{transaction_id}")
def get_transaction_by_id(
    transaction_id: int,
    db: Session = Depends(get_db_connection),
    current_user = Depends(get_current_user)
):
    transaction = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
        .first()
    )

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return TransactionResponse.model_validate(transaction)