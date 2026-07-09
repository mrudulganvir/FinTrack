from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database.db import get_db_connection
from backend.app.core.security import get_current_user
from backend.app.services.risk_service import analyze_portfolio

router = APIRouter(prefix="/risk", tags=["Portfolio Risk"])


@router.get("/portfolio-analysis")
def get_portfolio_analysis(
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    """
    Returns Sharpe ratio, volatility, diversification score, spending-to-investment
    ratio, and an overall Conservative/Moderate/Aggressive label for the logged-in
    user's holdings.
    """
    return analyze_portfolio(current_user.id, db)