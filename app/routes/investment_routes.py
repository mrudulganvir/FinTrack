from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db_connection
from app.database.models import Investment
from app.core.security import get_current_user
from pydantic import BaseModel
from typing import List, Optional
import requests
import os

router = APIRouter(prefix="/investments", tags=["Investments"])

class InvestmentCreate(BaseModel):
    name: str
    ticker: str
    type: str
    amount: float
    units: float
    current_value: Optional[float] = None

class InvestmentResponse(InvestmentCreate):
    id: int
    class Config:
        from_attributes = True

@router.get("/", response_model=List[InvestmentResponse])
def get_investments(db: Session = Depends(get_db_connection), current_user=Depends(get_current_user)):
    return db.query(Investment).filter(Investment.user_id == current_user.id).all()

@router.post("/", response_model=InvestmentResponse)
def add_investment(asset: InvestmentCreate, db: Session = Depends(get_db_connection), current_user=Depends(get_current_user)):
    new_asset = Investment(
        user_id=current_user.id,
        name=asset.name,
        ticker=asset.ticker,
        type=asset.type,
        amount=asset.amount,
        units=asset.units,
        current_value=asset.current_value or asset.amount
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    return new_asset

@router.post("/sync-live-prices")
def sync_live_prices(db: Session = Depends(get_db_connection), current_user=Depends(get_current_user)):
    """
    Fetches real-time prices for the user's portfolio and updates the database.
    """
    investments = db.query(Investment).filter(Investment.user_id == current_user.id).all()
    updated_count = 0
    
    api_key = os.getenv("YAHOO_FINANCE_API_KEY")
    api_host = os.getenv("YAHOO_FINANCE_API_HOST", "yh-finance.p.rapidapi.com")

    for asset in investments:
        if not asset.ticker:
            continue

        try:
            # 1. Handle Crypto via CoinGecko
            if asset.type.lower() == "crypto":
                url = f"https://api.coingecko.com/api/v3/simple/price?ids={asset.ticker.lower()}&vs_currencies=inr"
                res = requests.get(url, timeout=5).json()
                if asset.ticker.lower() in res:
                    live_price = res[asset.ticker.lower()]["inr"]
                    if asset.units:
                        asset.current_value = live_price * asset.units
                        updated_count += 1

            # 2. Handle Stocks & Mutual Funds via RapidAPI (Yahoo Finance)
            elif asset.type.lower() in ["equity", "mutual funds"]:
                if api_key:
                    # FETCHING VIA API KEY
                    url = f"https://{api_host}/stock/v2/get-summary"
                    ticker_symbol = asset.ticker if "." in asset.ticker else f"{asset.ticker}.NS"
                    headers = {"X-RapidAPI-Key": api_key, "X-RapidAPI-Host": api_host}
                    res = requests.get(url, headers=headers, params={"symbol": ticker_symbol}, timeout=10).json()
                    live_price = res.get("price", {}).get("regularMarketPrice", {}).get("raw")
                else:
                    # FALLBACK TO STANDARD YFINANCE
                    import yfinance as yf
                    ticker_symbol = asset.ticker if "." in asset.ticker else f"{asset.ticker}.NS"
                    live_price = yf.Ticker(ticker_symbol).fast_info.last_price
                
                if live_price and asset.units:
                    asset.current_value = live_price * asset.units
                    updated_count += 1
                        
        except Exception:
            continue

    db.commit()
    return {"message": f"Successfully synced {updated_count} assets."}