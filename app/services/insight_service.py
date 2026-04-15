from collections import defaultdict
from datetime import datetime, timedelta


def generate_insights(transactions):
    if not transactions:
        return {
            "top_category": None,
            "top_category_amount": 0,
            "largest_expense": None,
            "largest_expense_amount": 0,
            "avg_expense": 0,
            "this_month_spend": 0,
            "last_month_spend": 0,
            "spend_change_pct": 0,
            "savings_rate": 0,
            "monthly_income_avg": 0,
            "monthly_savings_avg": 0,
            "insights": ["No transactions yet. Add some to see insights."],
            "investment_plan": _default_investment_plan(),
        }

    expenses = [t for t in transactions if t.type == "expense"]
    incomes  = [t for t in transactions if t.type == "income"]
    now = datetime.now()

    # ── This month / last month ─────────────────────────────────────────────
    this_month = [t for t in expenses
                  if t.transaction_date.month == now.month and t.transaction_date.year == now.year]
    prev_date  = now.replace(day=1) - timedelta(days=1)
    last_month = [t for t in expenses
                  if t.transaction_date.month == prev_date.month
                  and t.transaction_date.year == prev_date.year]

    # ── Category totals ─────────────────────────────────────────────────────
    cat_totals = defaultdict(float)
    for t in expenses:
        cat_totals[(t.category or "Others").title()] += t.amount

    top_category        = max(cat_totals, key=cat_totals.get) if cat_totals else None
    top_category_amount = round(cat_totals[top_category], 2) if top_category else 0

    largest_expense = max(expenses, key=lambda x: x.amount, default=None)
    avg_expense     = round(sum(t.amount for t in expenses) / len(expenses), 2) if expenses else 0

    this_month_spend = round(sum(t.amount for t in this_month), 2)
    last_month_spend = round(sum(t.amount for t in last_month), 2)

    spend_change_pct = 0
    if last_month_spend > 0:
        spend_change_pct = round(((this_month_spend - last_month_spend) / last_month_spend) * 100, 2)

    # ── Monthly averages for investment plan ─────────────────────────────────
    # Group income and expenses by month
    monthly_income  = defaultdict(float)
    monthly_expense = defaultdict(float)
    for t in incomes:
        key = (t.transaction_date.year, t.transaction_date.month)
        monthly_income[key] += t.amount
    for t in expenses:
        key = (t.transaction_date.year, t.transaction_date.month)
        monthly_expense[key] += t.amount

    all_months = set(monthly_income.keys()) | set(monthly_expense.keys())
    monthly_income_avg  = round(sum(monthly_income.values())  / max(len(all_months), 1), 2)
    monthly_expense_avg = round(sum(monthly_expense.values()) / max(len(all_months), 1), 2)
    monthly_savings_avg = round(monthly_income_avg - monthly_expense_avg, 2)

    total_income  = sum(t.amount for t in incomes)
    total_expense = sum(t.amount for t in expenses)
    savings_rate  = round((total_income - total_expense) / total_income * 100, 1) if total_income > 0 else 0

    # ── Insight lines ────────────────────────────────────────────────────────
    insight_lines = []
    if top_category:
        insight_lines.append(f"🏆 Your highest spending category is **{top_category}** at ₹{top_category_amount:,.0f}.")
    if largest_expense:
        insight_lines.append(
            f"💸 Largest single expense: ₹{largest_expense.amount:,.0f} for '{largest_expense.description or largest_expense.category}'."
        )
    if this_month_spend > last_month_spend and last_month_spend > 0:
        insight_lines.append(f"📈 Spending is **up {abs(spend_change_pct)}%** vs last month — watch your budget!")
    elif this_month_spend < last_month_spend and last_month_spend > 0:
        insight_lines.append(f"📉 Spending is **down {abs(spend_change_pct)}%** vs last month — great discipline!")
    if savings_rate >= 30:
        insight_lines.append(f"🌟 Excellent savings rate of {savings_rate}%! You are building wealth.")
    elif savings_rate >= 15:
        insight_lines.append(f"👍 Good savings rate of {savings_rate}%. Aim for 30%+ to accelerate wealth.")
    elif savings_rate > 0:
        insight_lines.append(f"⚠️ Low savings rate of {savings_rate}%. Try to reduce discretionary spending.")
    else:
        insight_lines.append("🚨 You are spending more than you earn. Immediate budget review needed.")

    # ── Investment plan ──────────────────────────────────────────────────────
    investment_plan = _generate_investment_plan(
        monthly_savings=monthly_savings_avg,
        monthly_income=monthly_income_avg,
        savings_rate=savings_rate,
        top_category=top_category,
        cat_totals=cat_totals,
    )

    return {
        "top_category":            top_category,
        "top_category_amount":     top_category_amount,
        "largest_expense":         largest_expense.description if largest_expense else None,
        "largest_expense_amount":  round(largest_expense.amount, 2) if largest_expense else 0,
        "avg_expense":             avg_expense,
        "this_month_spend":        this_month_spend,
        "last_month_spend":        last_month_spend,
        "spend_change_pct":        spend_change_pct,
        "savings_rate":            savings_rate,
        "monthly_income_avg":      monthly_income_avg,
        "monthly_savings_avg":     monthly_savings_avg,
        "insights":                insight_lines,
        "investment_plan":         investment_plan,
    }


def _generate_investment_plan(monthly_savings, monthly_income, savings_rate, top_category, cat_totals):
    """
    Generate a personalised monthly investment allocation based on:
    - monthly_savings: how much the user saves each month on average
    - savings_rate: % of income saved
    - spending patterns: to identify risk tolerance signals

    Allocation logic:
    - Emergency fund first (if savings < 3 months expenses implied, we flag it)
    - Conservative profile:  savings_rate < 15%  → FD-heavy, no crypto
    - Moderate profile:      15% <= savings_rate < 30% → balanced
    - Aggressive profile:    savings_rate >= 30% → equity + crypto allowed

    Returns a list of allocation dicts with instrument, amount, pct, rationale.
    """
    if monthly_savings <= 0:
        return {
            "profile": "deficit",
            "monthly_investable": 0,
            "allocations": [],
            "message": "You are currently spending more than you earn. Focus on reducing expenses before investing.",
            "emergency_fund_note": "Build an emergency fund of 3–6 months of expenses first.",
        }

    # Risk profile
    if savings_rate < 15:
        profile = "conservative"
    elif savings_rate < 30:
        profile = "moderate"
    else:
        profile = "aggressive"

    # Keep 10% as liquid cash buffer, rest is investable
    investable = round(monthly_savings * 0.90, 0)

    if profile == "conservative":
        raw_alloc = [
            ("Fixed Deposits (FD)",       0.35, "#3b82f6", "🏦",  "Safe guaranteed returns (6–7.5% p.a.). Priority for low-surplus investors."),
            ("PPF / ELSS (Tax Saving)",    0.25, "#8b5cf6", "📋",  "Section 80C deduction + 7.1% guaranteed. Lock-in protects from impulse spending."),
            ("Liquid Mutual Funds",        0.20, "#14b8a6", "💧",  "Better than savings account, instantly redeemable emergency buffer."),
            ("Bonds / NPS",                0.15, "#f59e0b", "📜",  "Debt bonds for stable 7–8% returns without market risk."),
            ("Stocks (Nifty 50 Index)",    0.05, "#22c55e", "📈",  "Small equity allocation to begin building market exposure."),
        ]
    elif profile == "moderate":
        raw_alloc = [
            ("Index Funds (Nifty 50)",     0.30, "#22c55e", "📈",  "Low-cost passive equity. 12–14% historical CAGR. Core of a moderate portfolio."),
            ("PPF / ELSS (Tax Saving)",    0.20, "#8b5cf6", "📋",  "Tax savings + compounding. Must-have for salaried investors."),
            ("Fixed Deposits (FD)",        0.15, "#3b82f6", "🏦",  "Stable base with guaranteed returns for short-term goals."),
            ("Balanced Mutual Funds",      0.15, "#06b6d4", "⚖️",  "60:40 equity-debt mix. Cushions market falls while growing capital."),
            ("Bonds / NPS",                0.10, "#f59e0b", "📜",  "Pension corpus building and fixed income stability."),
            ("Cryptocurrency (BTC/ETH)",   0.05, "#f97316", "₿",   "Small high-risk allocation. Never invest what you cannot afford to lose."),
            ("Digital Gold / SGB",         0.05, "#eab308", "🥇",  "Inflation hedge. Sovereign Gold Bonds give 2.5% interest + gold appreciation."),
        ]
    else:  # aggressive
        raw_alloc = [
            ("Index Funds (Nifty 50/Next50)",0.25,"#22c55e", "📈", "Passive equity core. Low cost, broad diversification."),
            ("Small/Mid Cap Mutual Funds", 0.20, "#10b981", "🚀",  "Higher growth potential. 5–7 year horizon recommended."),
            ("US Stocks / ETFs",           0.15, "#6366f1", "🌍",  "Geographic diversification. Navi / Motilal Nasdaq 100 ETF."),
            ("Cryptocurrency (BTC/ETH)",   0.12, "#f97316", "₿",   "High risk, high reward. Limit to 10–15% of total portfolio."),
            ("Options / F&O (if learned)", 0.08, "#ef4444", "⚡",  "Only if you understand derivatives. Start with covered calls."),
            ("PPF / ELSS (Tax Saving)",    0.10, "#8b5cf6", "📋",  "Tax efficiency via 80C. Even aggressive investors need this."),
            ("Digital Gold / SGB",         0.05, "#eab308", "🥇",  "Hedge against equity downturns."),
            ("Angel Investing / Startups", 0.05, "#ec4899", "🦄",  "Very high risk. Only via SEBI-registered platforms like Tyke/WintWealth."),
        ]

    allocations = []
    for name, pct, color, icon, rationale in raw_alloc:
        amount = round(investable * pct, 0)
        allocations.append({
            "instrument": name,
            "icon":       icon,
            "color":      color,
            "pct":        round(pct * 100, 0),
            "amount":     amount,
            "rationale":  rationale,
        })

    profile_labels = {
        "conservative": "Conservative 🛡️",
        "moderate":     "Moderate ⚖️",
        "aggressive":   "Aggressive 🚀",
    }
    profile_desc = {
        "conservative": f"Your savings rate is {savings_rate}%. Focus on capital protection and tax efficiency before taking market risk.",
        "moderate":     f"Your savings rate is {savings_rate}%. A balanced approach — equity for growth, debt for stability.",
        "aggressive":   f"Your savings rate is {savings_rate}%! Strong surplus. A growth-oriented portfolio can maximise long-term wealth.",
    }

    return {
        "profile":              profile_labels[profile],
        "monthly_investable":   investable,
        "savings_rate":         savings_rate,
        "monthly_income":       monthly_income,
        "allocations":          allocations,
        "message":              profile_desc[profile],
        "emergency_fund_note":  "Ensure you have 3–6 months of expenses in a liquid fund before investing.",
        "disclaimer":           "These are algorithmic suggestions based on your spending patterns. Consult a SEBI-registered advisor before investing.",
    }


def _default_investment_plan():
    return {
        "profile":              "No Data",
        "monthly_investable":   0,
        "savings_rate":         0,
        "allocations":          [],
        "message":              "Add transactions to generate your personalised investment plan.",
        "emergency_fund_note":  "",
        "disclaimer":           "",
    }

def get_ai_advisor_signals(investments_data, savings_rate):
    """
    Algorithmic advisor that evaluates current holdings against risk profile
    to generate Buy/Sell/Hold signals.
    """
    if not investments_data:
        return [
            {"asset": "Index Funds (Nifty 50)", "action": "BUY", "type": "equity", "reason": "No investments detected. Start with a broad market index fund for baseline growth."},
            {"asset": "Emergency Fund (Liquid)", "action": "BUY", "type": "debt", "reason": "Establish a 3-6 month cash buffer before exploring high-risk assets."}
        ]

    # Determine risk profile based on savings rate
    profile = "conservative"
    if savings_rate >= 30:
        profile = "aggressive"
    elif savings_rate >= 15:
        profile = "moderate"

    total_value = sum((item.get("current_value") or item.get("amount", 0)) for item in investments_data)
    
    # Calculate current allocation percentages
    allocations = defaultdict(float)
    for item in investments_data:
        val = item.get("current_value") or item.get("amount", 0)
        allocations[item.get("type", "unknown").lower()] += val
        
    signals = []

    # ── CRYPTO LOGIC ──
    crypto_val = allocations.get("crypto", 0)
    crypto_pct = (crypto_val / total_value) * 100 if total_value > 0 else 0
    
    if crypto_pct > 0:
        if profile == "conservative":
            signals.append({"asset": "Cryptocurrency", "action": "SELL", "type": "crypto", "reason": "Your profile is conservative, but you hold highly volatile crypto assets. Consider reallocating to stable debt."})
        elif crypto_pct > 15:
            signals.append({"asset": "Cryptocurrency", "action": "SELL", "type": "crypto", "reason": f"Crypto makes up {crypto_pct:.1f}% of your portfolio. Take profits to reduce exposure below 10%."})
        else:
            signals.append({"asset": "Cryptocurrency", "action": "HOLD", "type": "crypto", "reason": "Crypto exposure is within acceptable limits for your profile. Monitor volatility."})
    elif profile == "aggressive":
        signals.append({"asset": "Bitcoin / Ethereum", "action": "BUY", "type": "crypto", "reason": "As an aggressive investor, a 2-5% allocation in blue-chip crypto can provide asymmetric upside."})

    # ── EQUITY / MUTUAL FUND LOGIC ──
    equity_val = allocations.get("equity", 0) + allocations.get("mutual funds", 0)
    equity_pct = (equity_val / total_value) * 100 if total_value > 0 else 0

    if profile == "aggressive" and equity_pct < 60:
        signals.append({"asset": "Small/Mid-Cap Mutual Funds", "action": "BUY", "type": "equity", "reason": "Your equity exposure is too low for an aggressive profile. Accumulate growth-oriented funds."})
    elif profile == "conservative" and equity_pct > 40:
        signals.append({"asset": "Direct Equity", "action": "SELL", "type": "equity", "reason": "High equity exposure contradicts your conservative profile. Shift profits into Fixed Deposits or Bonds."})
    else:
        signals.append({"asset": "Nifty 50 Index", "action": "HOLD", "type": "equity", "reason": "Core equity allocation is balanced. Continue SIPs regardless of market fluctuations."})

    # ── GOLD / COMMODITIES LOGIC ──
    gold_val = allocations.get("gold", 0)
    gold_pct = (gold_val / total_value) * 100 if total_value > 0 else 0

    if gold_pct < 5:
        signals.append({"asset": "Sovereign Gold Bonds (SGB)", "action": "BUY", "type": "commodity", "reason": "Zero or low gold exposure. Add SGBs as a hedge against inflation and equity market crashes."})
    elif gold_pct > 15:
        signals.append({"asset": "Physical Gold / Gold ETFs", "action": "SELL", "type": "commodity", "reason": "Gold allocation is dragging down overall portfolio returns. Cap it at 10%."})

    return signals