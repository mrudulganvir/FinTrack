"""
risk_service.py — Portfolio Risk Analyser

Plain-language summary of what this file does (see chat for the full explainer):

  1. For each stock/fund the user holds, download its recent daily price history
     from Yahoo Finance and turn it into a list of daily % gains/losses ("returns").
  2. From those returns compute:
       - Volatility   -> how much the price swings around (risk).
       - Sharpe Ratio -> return earned per unit of risk taken (reward vs risk).
  3. Combine all holdings into one weighted "portfolio return series" (bigger
     holdings count more) and compute the same two numbers for the portfolio
     as a whole.
  4. Compute a Diversification Score (0-100): are the eggs in one basket or
     spread out? Based on (a) how concentrated the money is across asset
     types, and (b) how similarly the holdings move together day to day.
  5. Compute Spending-to-Investment Ratio: monthly expenses vs total invested
     value — a highly-leveraged spender look different from a saver.
  6. Combine all of the above into one label: Conservative / Moderate / Aggressive.

No ML. Everything here is closed-form financial math on real price data.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
import yfinance as yf
from sqlalchemy.orm import Session

from backend.app.database.models import Investment, Transaction

log = logging.getLogger(__name__)

# ── Tunable constants (named, not magic numbers, so these are easy to defend/adjust) ──

RISK_FREE_RATE_ANNUAL = 0.07          # ~ current Indian T-bill / FD-adjacent rate, used in Sharpe
TRADING_DAYS_PER_YEAR = 252            # standard annualization factor for daily equity returns
PRICE_HISTORY_PERIOD = "1y"            # yfinance lookback window for return calculations
SPEND_WINDOW_DAYS = 30                 # trailing window used for the spending-to-investment ratio

# Thresholds used to turn raw numbers into a Conservative/Moderate/Aggressive label.
# Kept as named constants so they can be tuned later without touching the logic.
VOLATILITY_LOW = 0.15      # below this annualized volatility -> "low risk" bucket
VOLATILITY_HIGH = 0.30     # above this -> "high risk" bucket
SHARPE_GOOD = 0.75         # above this -> reward is worth the risk being taken
DIVERSIFICATION_GOOD = 60  # score (0-100) above which a portfolio counts as "well spread out"
SPEND_RATIO_HIGH = 0.5     # monthly-spend / total-invested above this -> overleveraged on spending

# In-process cache for price history so repeated dashboard loads don't hammer yfinance.
_price_cache: Dict[str, Dict] = {}
_CACHE_TTL = timedelta(hours=1)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Price history + per-holding return series
# ─────────────────────────────────────────────────────────────────────────────

def _normalize_ticker(ticker: str) -> str:
    """Reuses the same convention as investment_routes.py: assume NSE if no suffix given."""
    return ticker if "." in ticker else f"{ticker}.NS"


def get_daily_returns(ticker: str) -> Optional[pd.Series]:
    """
    Returns a pandas Series of daily % returns for the given ticker, or None if
    price history could not be fetched (delisted ticker, network issue, etc.).
    Cached for _CACHE_TTL to avoid refetching on every request.
    """
    symbol = _normalize_ticker(ticker)
    now = datetime.utcnow()

    cached = _price_cache.get(symbol)
    if cached and (now - cached["fetched_at"]) < _CACHE_TTL:
        return cached["returns"]

    try:
        history = yf.Ticker(symbol).history(period=PRICE_HISTORY_PERIOD)
        if history.empty or len(history) < 2:
            log.warning(f"No usable price history for {symbol}")
            return None
        returns = history["Close"].pct_change().dropna()
        _price_cache[symbol] = {"returns": returns, "fetched_at": now}
        return returns
    except Exception as e:
        log.warning(f"Failed to fetch price history for {symbol}: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# 2. Per-holding and portfolio-level Sharpe Ratio + Volatility
# ─────────────────────────────────────────────────────────────────────────────

def annualized_volatility(daily_returns: pd.Series) -> float:
    """Standard deviation of daily returns, scaled up to a yearly figure."""
    return float(daily_returns.std() * np.sqrt(TRADING_DAYS_PER_YEAR))


def sharpe_ratio(daily_returns: pd.Series, risk_free_annual: float = RISK_FREE_RATE_ANNUAL) -> float:
    """
    Sharpe Ratio = (annualized return - risk-free rate) / annualized volatility.
    Higher is better: more return earned per unit of risk taken.
    """
    vol = annualized_volatility(daily_returns)
    if vol == 0:
        return 0.0
    mean_daily_return = daily_returns.mean()
    annualized_return = mean_daily_return * TRADING_DAYS_PER_YEAR
    return float((annualized_return - risk_free_annual) / vol)


def compute_holding_metrics(investment: Investment) -> Dict:
    """Per-ticker Sharpe + volatility, with a clear failure state if data is unavailable."""
    returns = get_daily_returns(investment.ticker)
    if returns is None:
        return {
            "ticker": investment.ticker,
            "name": investment.name,
            "data_available": False,
            "volatility": None,
            "sharpe_ratio": None,
        }
    return {
        "ticker": investment.ticker,
        "name": investment.name,
        "data_available": True,
        "volatility": round(annualized_volatility(returns), 4),
        "sharpe_ratio": round(sharpe_ratio(returns), 4),
    }


def compute_portfolio_returns(investments: List[Investment]) -> Optional[pd.Series]:
    """
    Builds one value-weighted daily return series for the whole portfolio:
    each holding's daily returns are weighted by its current_value share of
    total portfolio value, then summed per day. Holdings with no price data
    are excluded (and their weight is redistributed across the rest).
    """
    weighted_series = []
    weights = []

    total_value = sum((inv.current_value or inv.amount or 0) for inv in investments)
    if total_value <= 0:
        return None

    for inv in investments:
        returns = get_daily_returns(inv.ticker)
        if returns is None or returns.empty:
            continue
        weight = (inv.current_value or inv.amount or 0) / total_value
        weighted_series.append(returns)
        weights.append(weight)

    if not weighted_series:
        return None

    # Re-normalize weights across only the holdings we actually have data for
    weight_sum = sum(weights)
    weights = [w / weight_sum for w in weights]

    combined = pd.concat(weighted_series, axis=1, join="inner")
    if combined.empty:
        return None

    portfolio_returns = (combined * weights).sum(axis=1)
    return portfolio_returns


# ─────────────────────────────────────────────────────────────────────────────
# 3. Diversification score
# ─────────────────────────────────────────────────────────────────────────────

def _concentration_score(investments: List[Investment]) -> float:
    """
    Herfindahl-Hirschman Index (HHI) on asset `type` weights, inverted to a 0-100
    "spread out" score. HHI ranges 0 (perfectly spread) to 1 (100% in one bucket).
    A single holding of a single type will score low here — which is correct,
    that IS concentrated, even though correlation can't be computed for it.
    """
    total_value = sum((inv.current_value or inv.amount or 0) for inv in investments)
    if total_value <= 0:
        return 0.0

    type_totals: Dict[str, float] = {}
    for inv in investments:
        value = inv.current_value or inv.amount or 0
        type_totals[inv.type] = type_totals.get(inv.type, 0) + value

    hhi = sum((value / total_value) ** 2 for value in type_totals.values())
    # HHI of 1.0 (all-in-one-type) -> score 0. HHI approaching 1/n (n types, evenly split) -> score near 100.
    return float(max(0.0, (1 - hhi)) * 100)


def _correlation_score(investments: List[Investment]) -> Optional[float]:
    """
    Average pairwise correlation of daily returns across holdings, inverted to a
    0-100 "spread out" score. Only meaningful with 2+ holdings that have price data.
    Low average correlation (holdings don't move together) -> high diversification.
    """
    return_series = []
    for inv in investments:
        returns = get_daily_returns(inv.ticker)
        if returns is not None and not returns.empty:
            return_series.append(returns.rename(inv.ticker))

    if len(return_series) < 2:
        return None

    combined = pd.concat(return_series, axis=1, join="inner")
    if combined.shape[0] < 2 or combined.shape[1] < 2:
        return None

    corr_matrix = combined.corr()
    n = corr_matrix.shape[0]
    # Average of the off-diagonal entries (excluding each ticker's correlation with itself)
    off_diagonal_sum = corr_matrix.values.sum() - n
    avg_corr = off_diagonal_sum / (n * (n - 1))

    # avg_corr ranges roughly -1..1. Map 1 (all move identically) -> 0, -1 (perfect hedge) -> 100.
    return float(max(0.0, min(100.0, (1 - avg_corr) * 50)))


def diversification_score(investments: List[Investment]) -> Dict:
    """
    Combines concentration (always available) and correlation (needs 2+ holdings
    with price history) into one 0-100 score. Falls back to concentration-only
    when correlation can't be computed, and says so explicitly in the response.
    """
    concentration = _concentration_score(investments)
    correlation = _correlation_score(investments)

    if correlation is None:
        return {
            "score": round(concentration, 1),
            "basis": "concentration_only",
            "note": "Correlation not included — need at least 2 holdings with available price history.",
        }

    combined_score = (concentration * 0.5) + (correlation * 0.5)
    return {
        "score": round(combined_score, 1),
        "basis": "concentration_and_correlation",
        "note": None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. Spending-to-investment ratio
# ─────────────────────────────────────────────────────────────────────────────

def spending_to_investment_ratio(user_id: int, total_invested_value: float, db: Session) -> Dict:
    """
    (Total expenses in the trailing window) / (total current portfolio value).
    A high ratio means the user is spending a lot relative to what they've built up.
    """
    window_start = datetime.utcnow() - timedelta(days=SPEND_WINDOW_DAYS)

    total_spend = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.transaction_date >= window_start,
        )
        .all()
    )
    spend_total = sum(t.amount for t in total_spend)

    if total_invested_value <= 0:
        return {"ratio": None, "window_days": SPEND_WINDOW_DAYS, "total_spend": round(spend_total, 2), "note": "No invested value to compare against."}

    ratio = spend_total / total_invested_value
    return {"ratio": round(ratio, 4), "window_days": SPEND_WINDOW_DAYS, "total_spend": round(spend_total, 2), "note": None}


# ─────────────────────────────────────────────────────────────────────────────
# 5. Final risk classification
# ─────────────────────────────────────────────────────────────────────────────

def classify_risk(
    portfolio_volatility: Optional[float],
    portfolio_sharpe: Optional[float],
    diversification: float,
    spend_ratio: Optional[float],
) -> Dict:
    """
    Simple, explainable point-based classifier — deliberately not a black box,
    since the whole pitch is "pure financial computation", not ML.

    Each signal nudges a score toward Aggressive (+1) or Conservative (-1):
      - High volatility            -> +1 (aggressive)
      - Low volatility             -> -1 (conservative)
      - Good Sharpe (efficient)    -> -1 (well-managed risk, more conservative-leaning)
      - Poor/negative Sharpe       -> +1 (taking risk without reward = aggressive/reckless)
      - Poor diversification      -> +1 (concentrated bets = aggressive)
      - Good diversification      -> -1
      - High spend-to-invest ratio -> +1 (little cushion, more exposed)
    Net score <= -2 -> Conservative, >= 2 -> Aggressive, else Moderate.
    """
    score = 0
    reasons = []

    if portfolio_volatility is not None:
        if portfolio_volatility >= VOLATILITY_HIGH:
            score += 1
            reasons.append(f"High portfolio volatility ({portfolio_volatility:.1%})")
        elif portfolio_volatility <= VOLATILITY_LOW:
            score -= 1
            reasons.append(f"Low portfolio volatility ({portfolio_volatility:.1%})")

    if portfolio_sharpe is not None:
        if portfolio_sharpe >= SHARPE_GOOD:
            score -= 1
            reasons.append(f"Strong risk-adjusted return (Sharpe {portfolio_sharpe:.2f})")
        elif portfolio_sharpe < 0:
            score += 1
            reasons.append(f"Negative risk-adjusted return (Sharpe {portfolio_sharpe:.2f})")

    if diversification >= DIVERSIFICATION_GOOD:
        score -= 1
        reasons.append(f"Well-diversified portfolio (score {diversification:.0f}/100)")
    else:
        score += 1
        reasons.append(f"Concentrated portfolio (score {diversification:.0f}/100)")

    if spend_ratio is not None and spend_ratio >= SPEND_RATIO_HIGH:
        score += 1
        reasons.append(f"High spending relative to investments ({spend_ratio:.1%} of portfolio value/month)")

    if score <= -2:
        label = "Conservative"
    elif score >= 2:
        label = "Aggressive"
    else:
        label = "Moderate"

    return {"label": label, "score": score, "reasons": reasons}


# ─────────────────────────────────────────────────────────────────────────────
# 6. Top-level orchestration — this is what the route calls
# ─────────────────────────────────────────────────────────────────────────────

def analyze_portfolio(user_id: int, db: Session) -> Dict:
    investments = db.query(Investment).filter(Investment.user_id == user_id).all()

    if not investments:
        return {
            "has_investments": False,
            "message": "No investments found. Add holdings first to get a risk analysis.",
        }

    total_value = sum((inv.current_value or inv.amount or 0) for inv in investments)

    holding_metrics = [compute_holding_metrics(inv) for inv in investments]

    portfolio_returns = compute_portfolio_returns(investments)
    portfolio_volatility = annualized_volatility(portfolio_returns) if portfolio_returns is not None else None
    portfolio_sharpe = sharpe_ratio(portfolio_returns) if portfolio_returns is not None else None

    diversification = diversification_score(investments)
    spend_info = spending_to_investment_ratio(user_id, total_value, db)

    classification = classify_risk(
        portfolio_volatility=portfolio_volatility,
        portfolio_sharpe=portfolio_sharpe,
        diversification=diversification["score"],
        spend_ratio=spend_info["ratio"],
    )

    return {
        "has_investments": True,
        "total_portfolio_value": round(total_value, 2),
        "holdings": holding_metrics,
        "portfolio": {
            "volatility": round(portfolio_volatility, 4) if portfolio_volatility is not None else None,
            "sharpe_ratio": round(portfolio_sharpe, 4) if portfolio_sharpe is not None else None,
        },
        "diversification": diversification,
        "spending_to_investment": spend_info,
        "risk_assessment": classification,
    }