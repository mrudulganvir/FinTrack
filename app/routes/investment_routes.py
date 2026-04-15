from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db_connection
from app.database.models import Investment
from app.core.security import get_current_user
import yfinance as yf
import requests

router = APIRouter(prefix="/investments", tags=["Investments"])

@router.post("/sync-live-prices")
def sync_live_prices(db: Session = Depends(get_db_connection), current_user=Depends(get_current_user)):
    """
    Fetches real-time prices for the user's portfolio and updates the database.
    """
    investments = db.query(Investment).filter(Investment.user_id == current_user.id).all()
    updated_count = 0

    for asset in investments:
        if not asset.ticker:
            continue

        try:
            # 1. Handle Crypto via CoinGecko (Free API)
            if asset.type.lower() == "crypto":
                # Assuming ticker is the coin id, e.g., 'bitcoin', 'ethereum'
                url = f"https://api.coingecko.com/api/v3/simple/price?ids={asset.ticker.lower()}&vs_currencies=inr"
                res = requests.get(url, timeout=5).json()
                if asset.ticker.lower() in res:
                    live_price = res[asset.ticker.lower()]["inr"]
                    # Calculate new current value based on holdings (amount invested / avg buy price)
                    # For simplicity, if 'units' exists, use it. Otherwise, this is a basic update.
                    if getattr(asset, 'units', None):
                        asset.current_value = live_price * asset.units
                        updated_count += 1

            # 2. Handle Indian Stocks & Mutual Funds via yfinance
            elif asset.type.lower() in ["equity", "mutual funds"]:
                # Ensure Indian stocks have .NS (NSE) or .BO (BSE) suffix (e.g., RELIANCE.NS)
                ticker_symbol = asset.ticker if "." in asset.ticker else f"{asset.ticker}.NS"
                ticker_data = yf.Ticker(ticker_symbol)
                
                # Fast info fetch
                todays_data = ticker_data.fast_info
                if hasattr(todays_data, 'last_price'):
                    live_price = todays_data.last_price
                    if getattr(asset, 'units', None):
                        asset.current_value = live_price * asset.units
                        updated_count += 1
                        
        except Exception as e:
            print(f"Failed to fetch live data for {asset.ticker}: {e}")
            continue

    db.commit()
    return {"message": f"Successfully synced {updated_count} assets with live market data."}