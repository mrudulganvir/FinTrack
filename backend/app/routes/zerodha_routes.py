from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.database.db import get_db_connection
from backend.app.core.security import get_current_user
from backend.app.services import zerodha_service
from backend.app.services.zerodha_service import ZerodhaNotConnectedError, ZerodhaSessionExpiredError

router = APIRouter(prefix="/zerodha", tags=["Zerodha"])


class ConnectRequest(BaseModel):
    request_token: str


@router.get("/login-url")
def login_url(current_user=Depends(get_current_user)):
    """Frontend redirects the browser to this URL to start Zerodha login."""
    return {"login_url": zerodha_service.get_login_url()}


@router.post("/connect")
def connect(
    payload: ConnectRequest,
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    """Called by the frontend's /zerodha/callback page with the request_token from the URL."""
    try:
        return zerodha_service.connect_account(current_user.id, payload.request_token, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect Zerodha account: {e}")


@router.get("/status")
def status(
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    return zerodha_service.get_connection_status(current_user.id, db)


@router.post("/sync-holdings")
def sync_holdings(
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    try:
        return zerodha_service.sync_holdings(current_user.id, db)
    except ZerodhaNotConnectedError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ZerodhaSessionExpiredError as e:
        raise HTTPException(status_code=401, detail=str(e))