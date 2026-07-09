"""
alert_service.py

Generates LLM-powered natural language spending alerts.
Example output: "Your dining expenses increased 42% compared to last month"

Two layers:
1. Rule engine  → builds a structured financial diff (fast, no LLM cost)
2. Mistral LLM  → turns the diff into 3-5 human-friendly alert sentences
"""

from collections import defaultdict
from datetime import datetime, timedelta
import json
import os
import urllib.request
import urllib.error


# ── helpers ───────────────────────────────────────────────────────────────────

def _norm(cat: str) -> str:
    return (cat or "Others").strip().title()


def _month_category_totals(transactions, month: int, year: int) -> dict:
    totals = defaultdict(float)
    for t in transactions:
        if (
            t.type == "expense"
            and t.transaction_date.month == month
            and t.transaction_date.year == year
        ):
            totals[_norm(t.category)] += t.amount
    return dict(totals)


def _build_financial_diff(transactions) -> dict:
    """Build a structured comparison between this month and last month."""
    now = datetime.now()
    prev = (now.replace(day=1) - timedelta(days=1))

    this_totals = _month_category_totals(transactions, now.month, now.year)
    last_totals = _month_category_totals(transactions, prev.month, prev.year)

    all_cats = set(this_totals) | set(last_totals)

    changes = []
    for cat in all_cats:
        curr = this_totals.get(cat, 0)
        prev_amt = last_totals.get(cat, 0)
        if prev_amt > 0:
            pct = round((curr - prev_amt) / prev_amt * 100, 1)
        elif curr > 0:
            pct = 100.0  # new category this month
        else:
            pct = 0.0
        changes.append({
            "category": cat,
            "this_month": round(curr, 0),
            "last_month": round(prev_amt, 0),
            "change_pct": pct,
        })

    changes.sort(key=lambda x: abs(x["change_pct"]), reverse=True)

    total_income = sum(t.amount for t in transactions if t.type == "income")
    total_expense = sum(t.amount for t in transactions if t.type == "expense")
    this_month_spend = sum(this_totals.values())
    last_month_spend = sum(last_totals.values())

    savings_rate = (
        round((total_income - total_expense) / total_income * 100, 1)
        if total_income > 0 else 0
    )

    return {
        "this_month": now.strftime("%B %Y"),
        "last_month": prev.strftime("%B %Y"),
        "this_month_total": round(this_month_spend, 0),
        "last_month_total": round(last_month_spend, 0),
        "savings_rate": savings_rate,
        "category_changes": changes[:8],  # top 8 by movement
    }


def _rule_based_alerts(diff: dict) -> list[str]:
    """
    Fallback: generate alerts purely from rules when Mistral is unavailable.
    Returns a list of natural-language strings.
    """
    alerts = []
    this_m = diff["this_month"]
    last_m = diff["last_month"]

    for c in diff["category_changes"]:
        cat  = c["category"]
        pct  = c["change_pct"]
        curr = c["this_month"]
        prev = c["last_month"]

        if pct >= 30 and prev > 0:
            alerts.append(
                f"⚠️ Your {cat} spending rose {pct}% this month "
                f"(₹{int(prev):,} → ₹{int(curr):,})."
            )
        elif pct <= -30 and prev > 0:
            alerts.append(
                f"✅ Great job! {cat} spending dropped {abs(pct)}% vs {last_m} "
                f"(₹{int(prev):,} → ₹{int(curr):,})."
            )
        elif prev == 0 and curr > 0:
            alerts.append(
                f"🆕 New spending in {cat} this month: ₹{int(curr):,}."
            )

    if diff["savings_rate"] < 10:
        alerts.append(
            f"🔴 Your savings rate is only {diff['savings_rate']}% — "
            "try cutting discretionary spending."
        )
    elif diff["savings_rate"] > 40:
        alerts.append(
            f"🌟 Excellent savings rate of {diff['savings_rate']}%! "
            "Consider putting the surplus to work in mutual funds."
        )

    if diff["last_month_total"] > 0:
        overall_pct = round(
            (diff["this_month_total"] - diff["last_month_total"])
            / diff["last_month_total"] * 100, 1
        )
        if overall_pct > 20:
            alerts.append(
                f"📈 Overall spending is up {overall_pct}% compared to {last_m}."
            )
        elif overall_pct < -20:
            alerts.append(
                f"📉 Overall spending dropped {abs(overall_pct)}% vs {last_m} — well done!"
            )

    return alerts[:5] if alerts else ["✅ Your spending looks stable this month. Keep it up!"]


def generate_ai_alerts(transactions) -> list[str]:
    """
    Main entry point. Returns 3-5 natural-language alert strings.
    Uses Mistral if MISTRAL_API_KEY is set, falls back to rule-based.
    """
    if not transactions:
        return ["📭 No transactions yet. Add some to see personalised alerts."]

    diff = _build_financial_diff(transactions)

    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        return _rule_based_alerts(diff)

    prompt = f"""You are a smart personal finance assistant for an Indian user.

Here is the user's spending comparison between {diff['last_month']} and {diff['this_month']}:

Overall spend last month : ₹{int(diff['last_month_total']):,}
Overall spend this month : ₹{int(diff['this_month_total']):,}
Savings rate             : {diff['savings_rate']}%

Category-wise changes:
{json.dumps(diff['category_changes'], indent=2)}

Generate exactly 4 personalised, specific financial alert messages in simple English.
Rules:
- Start each alert with an emoji (⚠️ ✅ 📈 📉 🔴 🟡 🟢 🆕 💡)
- Use exact rupee amounts (format: ₹X,XXX)
- Mention percentage changes where relevant
- Use Indian financial context
- Be concise (max 20 words per alert)
- Mix warnings AND positive reinforcements
- Return ONLY a JSON array of 4 strings, nothing else. Example:
["alert 1", "alert 2", "alert 3", "alert 4"]
"""

    try:
        payload = json.dumps({
            "model": "mistral-small-latest",
            "max_tokens": 512,
            "temperature": 0.4,
            "messages": [{"role": "user", "content": prompt}],
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://api.mistral.ai/v1/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=15) as res:
            data = json.loads(res.read())

        raw = data["choices"][0]["message"]["content"].strip()

        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        alerts = json.loads(raw.strip())

        if isinstance(alerts, list) and all(isinstance(a, str) for a in alerts):
            return alerts[:5]

        # Unexpected shape — fall back
        return _rule_based_alerts(diff)

    except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError, KeyError):
        return _rule_based_alerts(diff)