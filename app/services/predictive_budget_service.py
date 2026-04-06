from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional
import math
 
def _days_in_month(year: int, month: int) -> int:
    if month == 12:
        next_month = datetime(year + 1, 1, 1)
    else:
        next_month = datetime(year, month + 1, 1)
    return (next_month - datetime(year, month, 1)).days
 
 
def _linear_regression_slope(x_vals: list, y_vals: list) -> float:
    n = len(x_vals)
    if n < 2:
        return 0.0
    mean_x = sum(x_vals) / n
    mean_y = sum(y_vals) / n
    numerator   = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_vals, y_vals))
    denominator = sum((x - mean_x) ** 2 for x in x_vals)
    if denominator == 0:
        return 0.0
    return numerator / denominator
 
 
def _project_end_of_month(transactions, budget_limit: float, month: int, year: int) -> dict:
    now = datetime.now()
    total_days = _days_in_month(year, month)
    days_elapsed = now.day
    days_remaining = total_days - days_elapsed
 
    # ── Daily cumulative spend ────────────────────────────────────────────────
    daily_spend: dict[int, float] = defaultdict(float)
    for t in transactions:
        if (
            t.type == "expense"
            and t.transaction_date.month == month
            and t.transaction_date.year == year
        ):
            daily_spend[t.transaction_date.day] += t.amount
 
    current_spend = sum(daily_spend.values())
 
    # Build cumulative series for regression
    cum_spend = 0.0
    x_vals, y_vals = [], []
    for d in range(1, days_elapsed + 1):
        cum_spend += daily_spend.get(d, 0)
        x_vals.append(d)
        y_vals.append(cum_spend)
 
    # ── Linear regression on cumulative spend ────────────────────────────────
    slope = _linear_regression_slope(x_vals, y_vals) if len(x_vals) >= 3 else (
        current_spend / days_elapsed if days_elapsed > 0 else 0
    )
    daily_rate = max(slope, 0)  # can't be negative
 
    # Intercept: where the line crosses at day 0
    n = len(x_vals)
    if n >= 2:
        mean_x = sum(x_vals) / n
        mean_y = sum(y_vals) / n
        intercept = mean_y - slope * mean_x
    else:
        intercept = 0
 
    projected_spend = max(intercept + slope * total_days, current_spend)
 
    # ── Trend acceleration (2nd derivative proxy) ─────────────────────────────
    # Compare avg spend in first half vs second half of elapsed days
    mid = days_elapsed // 2
    first_half_daily  = sum(daily_spend.get(d, 0) for d in range(1, mid + 1)) / max(mid, 1)
    second_half_daily = sum(daily_spend.get(d, 0) for d in range(mid + 1, days_elapsed + 1)) / max(days_elapsed - mid, 1)
    trend_acceleration = round(second_half_daily - first_half_daily, 2)
 
    # ── Category breakdown ────────────────────────────────────────────────────
    cat_totals: dict[str, float] = defaultdict(float)
    for t in transactions:
        if (
            t.type == "expense"
            and t.transaction_date.month == month
            and t.transaction_date.year == year
        ):
            cat_totals[(t.category or "Others").title()] += t.amount
    top_cats = sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)[:4]
    category_breakdown = [
        {
            "category": cat,
            "amount": round(amt, 2),
            "pct_of_spend": round(amt / current_spend * 100, 1) if current_spend > 0 else 0,
        }
        for cat, amt in top_cats
    ]
 
    # ── Confidence (more data = more confident) ───────────────────────────────
    # At least 7 data points with spend = high confidence
    data_points_with_spend = sum(1 for d in range(1, days_elapsed + 1) if daily_spend.get(d, 0) > 0)
    confidence = min(data_points_with_spend / 7.0, 1.0)
 
    # ── Risk level ────────────────────────────────────────────────────────────
    pct_used      = round(current_spend / budget_limit * 100, 1) if budget_limit > 0 else 0
    projected_pct = round(projected_spend / budget_limit * 100, 1) if budget_limit > 0 else 0
    overshoot_amount = max(projected_spend - budget_limit, 0)
 
    if current_spend > budget_limit:
        risk_level = "exceeded"
    elif projected_pct >= 100:
        risk_level = "danger"
    elif projected_pct >= 80:
        risk_level = "warning"
    else:
        risk_level = "safe"
 
    return {
        "projected_spend":      round(projected_spend, 2),
        "current_spend":        round(current_spend, 2),
        "budget_limit":         round(budget_limit, 2),
        "days_elapsed":         days_elapsed,
        "days_remaining":       days_remaining,
        "total_days":           total_days,
        "daily_rate":           round(daily_rate, 2),
        "confidence":           round(confidence, 2),
        "risk_level":           risk_level,
        "overshoot_amount":     round(overshoot_amount, 2),
        "pct_used":             pct_used,
        "projected_pct":        projected_pct,
        "category_breakdown":   category_breakdown,
        "trend_acceleration":   trend_acceleration,
    }
 
 
def generate_predictive_alerts(transactions, budget_limit: Optional[float], month: int, year: int) -> dict:
    if budget_limit is None or budget_limit <= 0:
        return {
            "has_budget": False,
            "prediction": None,
            "notifications": [],
            "summary_message": "No budget set for this month. Set a budget to enable predictive alerts.",
        }
 
    expenses_this_month = [
        t for t in transactions
        if t.type == "expense"
        and t.transaction_date.month == month
        and t.transaction_date.year == year
    ]
 
    if not expenses_this_month:
        return {
            "has_budget": True,
            "prediction": None,
            "notifications": [
                {
                    "id": "no_txn",
                    "type": "info",
                    "title": "No expenses this month yet",
                    "message": "Add transactions to enable predictive budget tracking.",
                    "icon": "📭",
                    "actionable": False,
                }
            ],
            "summary_message": "No expenses recorded yet this month.",
        }
 
    pred = _project_end_of_month(transactions, budget_limit, month, year)
    notifications = _build_notifications(pred)
    summary = _build_summary(pred)
 
    return {
        "has_budget": True,
        "prediction": pred,
        "notifications": notifications,
        "summary_message": summary,
    }
 
 
def _build_notifications(pred: dict) -> list:
    """Build structured in-app notification payloads from the prediction."""
    notes = []
    rl = pred["risk_level"]
 
    # ── Primary budget status notification ───────────────────────────────────
    if rl == "exceeded":
        notes.append({
            "id": "budget_exceeded",
            "type": "danger",
            "title": "🚨 Budget Exceeded!",
            "message": (
                f"You've already spent ₹{pred['current_spend']:,.0f} against your "
                f"₹{pred['budget_limit']:,.0f} budget — "
                f"₹{pred['current_spend'] - pred['budget_limit']:,.0f} over limit."
            ),
            "icon": "🚨",
            "actionable": True,
            "action_label": "Review Expenses",
        })
    elif rl == "danger":
        notes.append({
            "id": "budget_danger",
            "type": "danger",
            "title": "🔴 Projected to Exceed Budget",
            "message": (
                f"At your current rate (₹{pred['daily_rate']:,.0f}/day), you're on track to spend "
                f"₹{pred['projected_spend']:,.0f} this month — "
                f"₹{pred['overshoot_amount']:,.0f} over your ₹{pred['budget_limit']:,.0f} budget."
            ),
            "icon": "🔴",
            "actionable": True,
            "action_label": "Cut Spending",
        })
    elif rl == "warning":
        notes.append({
            "id": "budget_warning",
            "type": "warning",
            "title": "⚠️ Approaching Budget Limit",
            "message": (
                f"You've used {pred['pct_used']}% of your budget with {pred['days_remaining']} days left. "
                f"Projected end-of-month spend: ₹{pred['projected_spend']:,.0f} ({pred['projected_pct']}% of budget)."
            ),
            "icon": "⚠️",
            "actionable": True,
            "action_label": "View Budget",
        })
    else:
        notes.append({
            "id": "budget_safe",
            "type": "success",
            "title": "✅ Budget on Track",
            "message": (
                f"Great job! Projected spend: ₹{pred['projected_spend']:,.0f} "
                f"({pred['projected_pct']}% of your ₹{pred['budget_limit']:,.0f} budget)."
            ),
            "icon": "✅",
            "actionable": False,
        })
 
    # ── Acceleration warning ──────────────────────────────────────────────────
    if pred["trend_acceleration"] > 200 and rl in ("warning", "danger"):
        top_cat = pred["category_breakdown"][0]["category"] if pred["category_breakdown"] else "various categories"
        notes.append({
            "id": "spend_accelerating",
            "type": "warning",
            "title": "📈 Spending Accelerating",
            "message": (
                f"Your daily spend has increased by ₹{pred['trend_acceleration']:,.0f}/day recently. "
                f"Top category: {top_cat}. Consider slowing down discretionary purchases."
            ),
            "icon": "📈",
            "actionable": False,
        })
 
    # ── Top category tip ─────────────────────────────────────────────────────
    if pred["category_breakdown"]:
        top = pred["category_breakdown"][0]
        if top["pct_of_spend"] > 40 and rl in ("warning", "danger", "exceeded"):
            notes.append({
                "id": "top_category_tip",
                "type": "tip",
                "title": f"💡 {top['category']} is your biggest spend",
                "message": (
                    f"₹{top['amount']:,.0f} ({top['pct_of_spend']}% of this month's expenses) "
                    f"went to {top['category']}. Reducing this category could save your budget."
                ),
                "icon": "💡",
                "actionable": False,
            })
 
    # ── Days remaining tip ────────────────────────────────────────────────────
    if pred["days_remaining"] <= 5 and rl in ("warning", "danger"):
        safe_daily = max((pred["budget_limit"] - pred["current_spend"]) / max(pred["days_remaining"], 1), 0)
        notes.append({
            "id": "end_of_month_tip",
            "type": "tip",
            "title": f"📅 Only {pred['days_remaining']} days left this month",
            "message": (
                f"To stay within budget, limit spending to ₹{safe_daily:,.0f}/day for the rest of the month."
            ),
            "icon": "📅",
            "actionable": False,
        })
 
    return notes
 
 
def _build_summary(pred: dict) -> str:
    rl = pred["risk_level"]
    if rl == "exceeded":
        return f"Budget exceeded by ₹{pred['current_spend'] - pred['budget_limit']:,.0f}. Immediate action needed."
    elif rl == "danger":
        return f"On track to overspend by ₹{pred['overshoot_amount']:,.0f} this month."
    elif rl == "warning":
        return f"Caution: projected to use {pred['projected_pct']}% of budget by month-end."
    else:
        return f"Spending is healthy. Projected to use {pred['projected_pct']}% of budget."
 