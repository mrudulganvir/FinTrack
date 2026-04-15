from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from app.database.db import get_db_connection
from app.database.models import Transaction
from app.core.security import get_current_user
from app.services.insight_service import generate_insights, get_ai_advisor_signals
from pydantic import BaseModel
from typing import List
import csv, io, json
from datetime import datetime
import urllib.request
import urllib.error
import os

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    income  = sum(t.amount for t in txs if t.type == "income")
    expense = sum(t.amount for t in txs if t.type == "expense")
    return {
        "total_income":      income,
        "total_expense":     expense,
        "balance":           income - expense,
        "transaction_count": len(txs),
    }


@router.get("/category-breakdown")
def category_breakdown(
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    rows = (
        db.query(Transaction.category, func.sum(Transaction.amount))
        .filter(Transaction.user_id == current_user.id, Transaction.type == "expense")
        .group_by(Transaction.category)
        .all()
    )
    return [{"category": cat or "Others", "total": round(total, 2)} for cat, total in rows]


@router.get("/monthly-spending")
def monthly_spending(
    year: int = Query(default=None),
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    year = year or datetime.now().year
    rows = (
        db.query(
            extract("month", Transaction.transaction_date).label("month"),
            func.sum(Transaction.amount).label("total"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            extract("year", Transaction.transaction_date) == year,
        )
        .group_by("month").order_by("month").all()
    )
    month_names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    result = {m: 0 for m in month_names}
    for row in rows:
        result[month_names[int(row.month) - 1]] = round(row.total, 2)
    return [{"month": m, "total": v} for m, v in result.items()]


@router.get("/daily-trend")
def daily_trend(
    month: int = Query(default=None),
    year: int  = Query(default=None),
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    now   = datetime.now()
    month = month or now.month
    year  = year  or now.year
    rows = (
        db.query(
            extract("day", Transaction.transaction_date).label("day"),
            func.sum(Transaction.amount).label("total"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            extract("month", Transaction.transaction_date) == month,
            extract("year",  Transaction.transaction_date) == year,
        )
        .group_by("day").order_by("day").all()
    )
    return [{"day": int(r.day), "total": round(r.total, 2)} for r in rows]


@router.get("/insights")
def report_insights(
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    return generate_insights(txs)


@router.get("/export/csv")
def export_csv(
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    txs = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.transaction_date.desc())
        .all()
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Date", "Type", "Category", "Description", "Amount (INR)"])
    for t in txs:
        # FIXED: Defend against databases returning standard string representations instead of Datetime objects
        date_str = ""
        if t.transaction_date:
            date_str = t.transaction_date.strftime("%Y-%m-%d") if hasattr(t.transaction_date, 'strftime') else str(t.transaction_date)[:10]
            
        writer.writerow([
            t.id,
            date_str,
            t.type,
            t.category or "",
            t.description or "",
            t.amount,
        ])
    output.seek(0)
    filename = f"fintrack_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── CHATBOT ──────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str    # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]


@router.post("/chat")
def chat(
    req: ChatRequest,
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    # Build user financial context from real data
    txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    insights = generate_insights(txs)

    income  = sum(t.amount for t in txs if t.type == "income")
    expense = sum(t.amount for t in txs if t.type == "expense")
    balance = income - expense

    # Category breakdown for context
    from collections import defaultdict
    cat_totals = defaultdict(float)
    for t in [tx for tx in txs if tx.type == "expense"]:
        cat_totals[t.category or "Others"] += t.amount
    cat_summary = ", ".join(f"{cat}: ₹{amt:,.0f}" for cat, amt in sorted(cat_totals.items(), key=lambda x: -x[1]))

    # Recent 10 transactions
    recent = sorted(txs, key=lambda x: x.transaction_date, reverse=True)[:10]
    recent_str = "\n".join(
        f"- {t.transaction_date.strftime('%d %b') if hasattr(t.transaction_date, 'strftime') else str(t.transaction_date)[:10]}: {t.type.upper()} ₹{t.amount:,.0f} | {t.category} | {t.description}"
        for t in recent
    )

    system_prompt = f"""You are FinTrack AI, a personal finance assistant embedded in a financial tracking application.
You have access to the user's actual financial data and must use it to answer questions accurately and helpfully.

USER'S FINANCIAL SUMMARY:
- Total Income (all time): ₹{income:,.0f}
- Total Expenses (all time): ₹{expense:,.0f}
- Current Balance: ₹{balance:,.0f}
- Savings Rate: {insights.get('savings_rate', 0)}%
- Average Monthly Income: ₹{insights.get('monthly_income_avg', 0):,.0f}
- Average Monthly Savings: ₹{insights.get('monthly_savings_avg', 0):,.0f}
- Top Spending Category: {insights.get('top_category', 'N/A')} (₹{insights.get('top_category_amount', 0):,.0f})
- This Month Spend: ₹{insights.get('this_month_spend', 0):,.0f}
- Last Month Spend: ₹{insights.get('last_month_spend', 0):,.0f}
- Total Transactions: {len(txs)}

EXPENSE BREAKDOWN BY CATEGORY:
{cat_summary or 'No expenses yet'}

RECENT TRANSACTIONS:
{recent_str or 'No transactions yet'}

INVESTMENT PROFILE: {insights.get('investment_plan', {}).get('profile', 'N/A')}
MONTHLY INVESTABLE AMOUNT: ₹{insights.get('investment_plan', {}).get('monthly_investable', 0):,.0f}

RULES:
1. Always answer in the context of this user's actual data shown above.
2. Be specific — use actual numbers from the data, not vague advice.
3. For investment questions, reference the investment plan profile and monthly investable amount.
4. Be concise and friendly. Use Indian financial context (INR, Indian markets, SEBI, NSE/BSE, etc.).
5. If asked about something not in the data, say so clearly instead of making up numbers.
6. Format responses clearly — use bullet points for lists, bold for important numbers.
7. You can suggest budget optimizations based on actual spending patterns."""

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {
            "reply": "Chatbot not configured. Please set the ANTHROPIC_API_KEY environment variable in your .env file to enable the AI assistant.",
            "error": True
        }

    messages_payload = [{"role": m.role, "content": m.content} for m in req.messages]

    payload = json.dumps({
        "model":      "claude-sonnet-4-5",
        "max_tokens": 1024,
        "system":     system_prompt,
        "messages":   messages_payload,
    }).encode("utf-8")

    request = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key":         api_key,
            "anthropic-version": "2023-06-01",
            "content-type":      "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
            reply  = result["content"][0]["text"]
            return {"reply": reply, "error": False}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return {"reply": f"API error: {e.code} — {body}", "error": True}
    except Exception as e:
        return {"reply": f"Connection error: {str(e)}", "error": True}

@router.get("/smart-advisor")
def smart_advisor(
    db: Session = Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    # Get transaction history for savings rate calculation
    txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    incomes = sum(t.amount for t in txs if t.type == "income")
    expenses = sum(t.amount for t in txs if t.type == "expense")
    savings_rate = round((incomes - expenses) / incomes * 100, 1) if incomes > 0 else 0

    # Mocking investment fetch (replace with your actual DB query for investments)
    # e.g., investments = db.query(Investment).filter(...).all()
    # For now, we simulate the data structure expected by the advisor
    mock_investments = [
        {"type": "equity", "current_value": 85000},
        {"type": "mutual funds", "current_value": 42000},
        {"type": "gold", "current_value": 15000},
        {"type": "crypto", "current_value": 5000}
    ]

    signals = get_ai_advisor_signals(mock_investments, savings_rate)
    
    return {
        "risk_profile": "Aggressive" if savings_rate >= 30 else "Moderate" if savings_rate >= 15 else "Conservative",
        "savings_rate": savings_rate,
        "signals": signals
    }