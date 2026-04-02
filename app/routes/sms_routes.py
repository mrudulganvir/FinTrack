from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database.db import get_db_connection
from app.database.models import Transaction
from app.core.security import get_current_user
from app.services.sms_parser_service import parse_sms, ParsedTransaction
from app.services.categorization_service import predict_with_confidence
from app.services.balance_service import calculate_balance
from app.schemas.transaction_schema import TransactionResponse
from datetime import datetime

router = APIRouter(prefix="/sms", tags=["SMS Parser"])


class SMSRequest(BaseModel):
    body: str                        # raw SMS text
    received_at: Optional[str] = None  # ISO datetime string, defaults to now


class SMSBatchRequest(BaseModel):
    messages: list[SMSRequest]


@router.post("/parse")
def parse_single_sms(
    req: SMSRequest,
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    """
    Parse a single SMS and return the detected transaction (does NOT save).
    Useful for previewing before confirm.
    """
    parsed = parse_sms(req.body)
    if not parsed:
        return {"detected": False, "message": "No transaction found in this SMS."}

    return {"detected": True, "transaction": parsed}


@router.post("/import")
def import_from_sms(
    req: SMSRequest,
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    """
    Parse SMS and immediately save the transaction to the database.
    Called by the Android app after user confirms.
    """
    parsed = parse_sms(req.body)
    if not parsed:
        return {"success": False, "message": "Could not parse a transaction from this SMS."}

    category, confidence = predict_with_confidence(parsed["description"])

    tx_date = datetime.now()
    if req.received_at:
        try:
            tx_date = datetime.fromisoformat(req.received_at)
        except ValueError:
            pass

    new_tx = Transaction(
        amount=parsed["amount"],
        type=parsed["type"],
        category=category,
        description=parsed["description"],
        user_id=current_user.id,
        transaction_date=tx_date,
    )
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)

    balance = calculate_balance(db, current_user.id)

    return {
        "success": True,
        "transaction": TransactionResponse.model_validate(new_tx),
        "predicted_category": category,
        "confidence": round(confidence, 3),
        "current_balance": balance,
    }


@router.post("/import-batch")
def import_batch(
    req: SMSBatchRequest,
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    """
    Parse and import multiple SMS messages at once.
    Skips duplicates by checking amount + date within 60 seconds.
    """
    imported = []
    skipped  = []

    for sms in req.messages:
        parsed = parse_sms(sms.body)
        if not parsed:
            skipped.append({"sms": sms.body[:60], "reason": "No transaction detected"})
            continue

        tx_date = datetime.now()
        if sms.received_at:
            try:
                tx_date = datetime.fromisoformat(sms.received_at)
            except ValueError:
                pass

        category, confidence = predict_with_confidence(parsed["description"])

        new_tx = Transaction(
            amount=parsed["amount"],
            type=parsed["type"],
            category=category,
            description=parsed["description"],
            user_id=current_user.id,
            transaction_date=tx_date,
        )
        db.add(new_tx)
        db.commit()
        db.refresh(new_tx)
        imported.append(TransactionResponse.model_validate(new_tx))

    balance = calculate_balance(db, current_user.id)

    return {
        "imported_count": len(imported),
        "skipped_count":  len(skipped),
        "imported":       imported,
        "skipped":        skipped,
        "current_balance": balance,
    }