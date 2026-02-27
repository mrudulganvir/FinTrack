from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db_connection
from app.core.security import get_current_user
from app.database.models import User

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("/")
def get_transactions(
    db: Session = Depends(get_db_connection),
    current_user: User = Depends(get_current_user)
):
    return {
        "message": f"Hello {current_user.email}, you are authorized!"
    }