"""
zerodha_service.py — Zerodha Kite Connect integration.

Flow (frontend handles the redirect, per your setup):
  1. Frontend calls GET /zerodha/login-url  -> gets Kite's login page URL, redirects user there.
  2. User logs into Zerodha, Kite redirects the BROWSER to your frontend route
     (KITE_REDIRECT_URL, e.g. http://localhost:5173/zerodha/callback?request_token=...&status=success).
  3. Frontend page reads `request_token` from the URL and calls
     POST /zerodha/connect  {"request_token": "..."}  (normal authenticated API call, JWT in header).
  4. Backend exchanges request_token -> access_token via Kite, stores it against the user.
  5. Frontend calls POST /zerodha/sync-holdings whenever it wants fresh data
     (e.g. on page load, or on a "Sync with Zerodha" button).

Important operational note: Kite invalidates every access_token daily (~7:30 AM IST).
There is no long-lived refresh here — /zerodha/status tells the frontend whether
today's session is still valid, so it knows when to prompt the user to reconnect.
"""

import logging
import os
from datetime import datetime
from typing import Dict, List, Optional

from kiteconnect import KiteConnect
from kiteconnect.exceptions import TokenException
from sqlalchemy.orm import Session

from backend.app.database.models import Investment, ZerodhaConnection

log = logging.getLogger(__name__)

KITE_API_KEY = os.getenv("KITE_API_KEY")
KITE_API_SECRET = os.getenv("KITE_API_SECRET")


class ZerodhaNotConnectedError(Exception):
    """Raised when a user has no stored Kite session at all."""
    pass


class ZerodhaSessionExpiredError(Exception):
    """Raised when the stored access_token is no longer valid (daily Kite expiry)."""
    pass


def _get_client(access_token: Optional[str] = None) -> KiteConnect:
    if not KITE_API_KEY:
        raise RuntimeError("KITE_API_KEY is not set — create a Kite Connect app first.")
    return KiteConnect(api_key=KITE_API_KEY, access_token=access_token)


def get_login_url() -> str:
    """Returns the URL the frontend should redirect the user to for Zerodha login."""
    kite = _get_client()
    return kite.login_url()


def connect_account(user_id: int, request_token: str, db: Session) -> Dict:
    """
    Exchanges the request_token (from Kite's redirect) for an access_token,
    and stores/updates it against this user. Called once per day per user.
    """
    if not KITE_API_SECRET:
        raise RuntimeError("KITE_API_SECRET is not set — create a Kite Connect app first.")

    kite = _get_client()
    session_data = kite.generate_session(request_token, api_secret=KITE_API_SECRET)

    access_token = session_data["access_token"]
    kite_user_id = session_data.get("user_id")
    login_time = session_data.get("login_time") or datetime.utcnow()

    connection = db.query(ZerodhaConnection).filter(ZerodhaConnection.user_id == user_id).first()
    if connection:
        connection.access_token = access_token
        connection.kite_user_id = kite_user_id
        connection.login_time = login_time
    else:
        connection = ZerodhaConnection(
            user_id=user_id,
            access_token=access_token,
            kite_user_id=kite_user_id,
            login_time=login_time,
        )
        db.add(connection)

    db.commit()
    return {"connected": True, "kite_user_id": kite_user_id, "login_time": str(login_time)}


def get_connection_status(user_id: int, db: Session) -> Dict:
    connection = db.query(ZerodhaConnection).filter(ZerodhaConnection.user_id == user_id).first()
    if not connection:
        return {"connected": False, "reason": "No Zerodha account linked yet."}

    # Cheapest possible liveness check: call a lightweight authenticated endpoint.
    try:
        kite = _get_client(access_token=connection.access_token)
        profile = kite.profile()
        return {
            "connected": True,
            "kite_user_id": connection.kite_user_id,
            "login_time": str(connection.login_time),
            "name": profile.get("user_name"),
        }
    except TokenException:
        return {"connected": False, "reason": "Session expired — Zerodha requires daily re-login. Please reconnect."}
    except Exception as e:
        return {"connected": False, "reason": f"Could not verify session: {e}"}


def _normalize_ticker(tradingsymbol: str, exchange: str) -> str:
    """Match the yfinance suffix convention used elsewhere in this app (.NS / .BO)."""
    suffix = ".BO" if exchange == "BSE" else ".NS"
    return f"{tradingsymbol}{suffix}"


def sync_holdings(user_id: int, db: Session) -> Dict:
    """
    Pulls the user's real equity holdings from Kite and upserts them into the
    existing `Investment` table — matched by (user_id, ticker). This is the only
    integration point with the rest of the app: risk_service.py, investment_routes.py,
    and the frontend all keep working unchanged because they just read Investment rows.
    """
    connection = db.query(ZerodhaConnection).filter(ZerodhaConnection.user_id == user_id).first()
    if not connection:
        raise ZerodhaNotConnectedError("No Zerodha account linked. Call /zerodha/login-url first.")

    kite = _get_client(access_token=connection.access_token)

    try:
        holdings = kite.holdings()
    except TokenException:
        raise ZerodhaSessionExpiredError("Zerodha session expired — please reconnect (daily re-login required).")

    synced, skipped = 0, 0

    for h in holdings:
        tradingsymbol = h.get("tradingsymbol")
        exchange = h.get("exchange", "NSE")
        quantity = h.get("quantity", 0)
        average_price = h.get("average_price", 0)
        last_price = h.get("last_price", 0)

        if not tradingsymbol or quantity <= 0:
            skipped += 1
            continue

        ticker = _normalize_ticker(tradingsymbol, exchange)

        existing = (
            db.query(Investment)
            .filter(Investment.user_id == user_id, Investment.ticker == ticker)
            .first()
        )

        if existing:
            existing.units = quantity
            existing.amount = quantity * average_price
            existing.current_value = quantity * last_price
        else:
            db.add(Investment(
                user_id=user_id,
                name=tradingsymbol,
                ticker=ticker,
                type="Equity",
                amount=quantity * average_price,
                units=quantity,
                current_value=quantity * last_price,
            ))
        synced += 1

    db.commit()
    return {"synced": synced, "skipped": skipped, "total_from_kite": len(holdings)}