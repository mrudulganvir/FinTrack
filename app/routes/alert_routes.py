from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db_connection
from app.database.models import Transaction
from app.core.security import get_current_user
from app.services.alert_service import generate_ai_alerts
 
router = APIRouter(prefix="/alerts", tags=["AI Alerts"])
 
 
@router.get("/")
def get_alerts(
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    alerts = generate_ai_alerts(txs)
    return {"alerts": alerts}