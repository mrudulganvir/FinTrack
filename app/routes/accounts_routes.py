from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db_connection
from app.database.models import User, LinkedAccount, LinkedCard
from app.core.security import get_current_user
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/accounts", tags=["Accounts"])

class LinkedAccountResponse(BaseModel):
    id: int
    institution_name: str
    account_id: str  # Masked
    account_type: str
    balance: float

class LinkedCardResponse(BaseModel):
    id: int
    card_type: str
    network: str
    last4: str

@router.get("/summary")
def get_accounts_summary(
    db: Session = Depends(get_db_connection),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch linked accounts and cards for the current user.
    Mask sensitive information.
    """
    accounts = db.query(LinkedAccount).filter(LinkedAccount.user_id == current_user.id).all()
    cards = db.query(LinkedCard).filter(LinkedCard.user_id == current_user.id).all()

    # Mask account ID (show only last 4)
    formatted_accounts = []
    for acc in accounts:
        # Example: XXXXXXXXXX1234
        masked_id = "*" * (len(acc.account_id) - 4) + acc.account_id[-4:] if acc.account_id and len(acc.account_id) > 4 else acc.account_id
        formatted_accounts.append({
            "id": acc.id,
            "institution_name": acc.institution_name,
            "account_id": masked_id,
            "account_type": acc.account_type,
            "balance": acc.balance
        })

    return {
        "accounts": formatted_accounts,
        "cards": [
            {
                "id": card.id,
                "card_type": card.card_type,
                "network": card.network,
                "last4": f"**** {card.last4}"
            } for card in cards
        ]
    }
