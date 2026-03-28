from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db_connection
from app.database.models import Transaction
from app.core.security import get_current_user
from app.services.chatbot_service import generate_reply
from app.schemas.chat_schema import ChatRequest

router = APIRouter(prefix="/chat", tags=["Chatbot"])


@router.post("/")
def chat(
    query: ChatRequest,
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user)
):
    user_query = query.message

    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).all()

    if not transactions:
        return {"reply": "No transactions found."}

    reply = generate_reply(user_query, transactions)

    return {"reply": reply}