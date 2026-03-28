from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db_connection
from app.database.models import Transaction
from app.schemas.transaction_schema import TransactionCreate, TransactionResponse
from app.services.balance_service import calculate_balance
from app.services.categorization_service import predict_with_confidence
from app.core.security import get_current_user

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post("/", response_model=dict)
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    auto_categorized = False
    confidence = 0.0

    if transaction.description and transaction.description.strip():
        final_category, confidence = predict_with_confidence(transaction.description)
        auto_categorized = True
    else:
        final_category = "Others"

    new_tx = Transaction(
        amount=transaction.amount,
        type=transaction.type,
        category=final_category,
        description=transaction.description,
        user_id=current_user.id,
        transaction_date=transaction.transaction_date,
    )

    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)

    balance = calculate_balance(db, current_user.id)

    return {
        "message": "Transaction added successfully",
        "transaction": TransactionResponse.model_validate(new_tx),
        "predicted_category": final_category,
        "current_balance": balance,
        "auto_categorized": auto_categorized,
        "confidence": round(confidence, 3),
    }

@router.get("/")
def get_transactions(
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    txs = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.transaction_date.desc())
        .all()
    )
    balance = calculate_balance(db, current_user.id)
    return {
        "transactions": [TransactionResponse.model_validate(t) for t in txs],
        "current_balance": balance,
    }


@router.get("/{transaction_id}")
def get_by_id(
    transaction_id: int,
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    tx = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return TransactionResponse.model_validate(tx)


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    tx = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
    return {"message": "Transaction deleted"}