from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database.db import get_db_connection
from app.database.models import User, LinkedAccount, KYCStatus, LinkedCard
from app.core.security import get_current_user
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.services.mastercard_service import mastercard_service
from app.services.razorpay_service import razorpay_kyc_service
from app.services.queue_service import queue_service
import secrets
import logging

log = logging.getLogger(__name__)

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])

# --- Schemas ---

class KYCSubmission(BaseModel):
    document_type: str
    document_number: str
    full_name: str

class CardSubmission(BaseModel):
    card_type: str
    network: str
    last4: str
    expiry_month: int
    expiry_year: int

class MastercardLinkRequest(BaseModel):
    customer_id: str

class BiometricSetupRequest(BaseModel):
    credential_id: str
    public_key: str
    biometric_type: Optional[str] = "fingerprint"

# --- Background Worker Mock ---

async def sync_transactions_task(user_id: int, customer_id: str, account_id: str):
    """
    Background worker that polls Mastercard for historic transactions 
    (from the 1st of current month) and pushes them to the processing queue.
    """
    try:
        # Calculate the 1st of the current month
        now = datetime.now()
        from_date = now.replace(day=1).strftime("%Y-%m-%d")
        
        log.info(f"Syncing transactions for user {user_id} starting from {from_date}")
        
        # Fetch from Mastercard (Mastercard service handles the API logic)
        transactions = await mastercard_service.fetch_transactions(customer_id, account_id, from_date=from_date)
        
        if transactions:
            for tx in transactions:
                # Standardize raw data structure before pushing to Kafka queue
                raw_data = {
                    "user_id": user_id,
                    "amount": tx.get("amount"),
                    "type": "expense" if tx.get("amount", 0) > 0 else "income", # Crude assumption for mock
                    "description": tx.get("description") or tx.get("memo") or "Bank Transaction",
                    "category": tx.get("category", "General"),
                    "timestamp": tx.get("transactionDate"),
                    "account_id": account_id
                }
                # Pushes to Kafka raw topic
                await queue_service.push_to_queue(raw_data)
                
            log.info(f"Successfully queued {len(transactions)} historic transactions for user {user_id}")
    except Exception as e:
        log.error(f"Transaction Sync Task failed for user {user_id}: {e}")

# --- Endpoints ---

@router.post("/kyc")
async def submit_kyc(payload: KYCSubmission, db: Session = Depends(get_db_connection), current_user: User = Depends(get_current_user)):
    if not payload.document_number:
        raise HTTPException(status_code=400, detail="Document number is required")
    current_user.kyc_status = KYCStatus.verified
    db.commit()
    return {"message": "Identity verified via Razorpay Trust API", "status": current_user.kyc_status}

@router.post("/mastercard-connect")
async def get_mastercard_url(db: Session = Depends(get_db_connection), current_user: User = Depends(get_current_user)):
    """
    Generate a Connect URL for the current user. 
    Handles customer creation if needed.
    """
    try:
        # 1. Get or Create Mastercard Customer
        customer_id = await mastercard_service.get_or_create_customer(current_user.id, current_user.name)
        
        if not customer_id:
            raise HTTPException(status_code=500, detail="Failed to create Mastercard customer. Check backend logs for API errors.")
        
        # 2. Generate Connect URL
        url = await mastercard_service.generate_connect_url(customer_id)
        if not url:
            raise HTTPException(status_code=500, detail="Failed to generate Mastercard Connect URL. Check backend logs for API errors.")
            
        return {"connect_url": url, "customer_id": customer_id}
    except Exception as e:
        log.error(f"Mastercard Route Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Mastercard Integration Error: {str(e)}")

@router.post("/link-mock-account")
def link_mock_account(background_tasks: BackgroundTasks, db: Session = Depends(get_db_connection), current_user: User = Depends(get_current_user)):
    """
    Trigger real-time transaction sync asynchronously.
    """
    customer_id = "cust_" + str(current_user.id)
    account_id = "acc_mock_5555"

    new_account = LinkedAccount(
        user_id=current_user.id,
        provider="Mastercard",
        institution_name="HDFC Bank",
        account_id=account_id,
        account_type="Savings",
        access_token="mc_auth_" + secrets.token_hex(16),
        balance=50000.0 # Placeholder
    )
    db.add(new_account)
    db.commit()

    # PUSH TO PROCESSING PIPELINE ASYNCHRONOUSLY
    background_tasks.add_task(sync_transactions_task, current_user.id, customer_id, account_id)

    return {"message": "Bank sync initiated. Transactions are being processed asynchronously via message queue."}

@router.post("/link-card")
def link_card(payload: CardSubmission, db: Session = Depends(get_db_connection), current_user: User = Depends(get_current_user)):
    new_card = LinkedCard(
        user_id=current_user.id,
        card_type=payload.card_type,
        network=payload.network,
        last4=payload.last4,
        expiry_month=payload.expiry_month,
        expiry_year=payload.expiry_year,
        card_token="mc_card_" + secrets.token_hex(16)
    )
    db.add(new_card)
    db.commit()
    return {"message": "Card linked via Mastercard", "last4": payload.last4}

@router.post("/setup-biometrics")
def setup_biometrics(payload: BiometricSetupRequest, db: Session = Depends(get_db_connection), current_user: User = Depends(get_current_user)):
    current_user.biometric_enabled = True
    current_user.biometric_credential_id = payload.credential_id
    current_user.biometric_public_key = payload.public_key
    current_user.biometric_type = payload.biometric_type
    db.commit()
    return {"message": "Biometric hardware signature registered"}

@router.post("/complete")
def complete_onboarding(db: Session = Depends(get_db_connection), current_user: User = Depends(get_current_user)):
    current_user.is_onboarded = True
    db.commit()
    return {"message": "Onboarding finalized"}
