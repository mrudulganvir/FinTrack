import re
from typing import Optional, TypedDict
from datetime import datetime


class ParsedTransaction(TypedDict):
    amount: float
    type: str          # "income" | "expense"
    description: str
    merchant: Optional[str]
    raw_sms: str


_AMOUNT_PATTERNS = [
    r"(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)",
    r"([\d,]+(?:\.\d{1,2})?)\s*(?:INR|Rs\.?|₹)",
]


def _extract_amount(text: str) -> Optional[float]:
    for pat in _AMOUNT_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            raw = m.group(1).replace(",", "")
            try:
                return float(raw)
            except ValueError:
                continue
    return None


# ── Transaction type detection ────────────────────────────────────────────────

_DEBIT_KEYWORDS = [
    "debited", "debit", "paid", "payment", "purchase", "withdrawn",
    "sent", "transferred to", "spent", "charged", "emi deducted",
    "bill payment", "pos txn", "pos purchase",
]
_CREDIT_KEYWORDS = [
    "credited", "credit", "received", "deposited", "refund",
    "cashback", "salary", "neft cr", "imps cr", "transferred to your",
]


def _detect_type(text: str) -> Optional[str]:
    lower = text.lower()
    for kw in _CREDIT_KEYWORDS:
        if kw in lower:
            return "income"
    for kw in _DEBIT_KEYWORDS:
        if kw in lower:
            return "expense"
    return None


# ── Merchant / payee extraction ───────────────────────────────────────────────

_UPI_VPA_RE   = re.compile(r"(?:to\s+VPA|UPI\s+to|to)\s+([\w.\-]+)@[\w]+", re.IGNORECASE)
_PAID_TO_RE   = re.compile(r"(?:paid|payment|sent|transferred)\s+to\s+([\w\s]+?)(?:\.|,|via|on|ref|\d|$)", re.IGNORECASE)
_AT_MERCH_RE  = re.compile(r"\bat\s+([A-Z][A-Za-z0-9 &\-]{2,30})", re.IGNORECASE)


def _extract_merchant(text: str) -> Optional[str]:
    for pat in [_UPI_VPA_RE, _PAID_TO_RE, _AT_MERCH_RE]:
        m = pat.search(text)
        if m:
            raw = m.group(1).strip()
            return raw.title()[:40]
    return None


# ── Description builder ───────────────────────────────────────────────────────

def _build_description(merchant: Optional[str], tx_type: str, text: str) -> str:
    if merchant:
        return f"{'Payment to' if tx_type == 'expense' else 'Received from'} {merchant}"

    lower = text.lower()
    if "atm" in lower:
        return "ATM Withdrawal"
    if "emi" in lower:
        return "EMI Payment"
    if "bill" in lower:
        return "Bill Payment"
    if "salary" in lower or "sal cr" in lower:
        return "Salary Credit"
    if "refund" in lower:
        return "Refund"
    if "recharge" in lower:
        return "Mobile Recharge"

    return "UPI Transaction" if tx_type == "expense" else "Bank Credit"


# ── Main parser ───────────────────────────────────────────────────────────────

def parse_sms(body: str) -> Optional[ParsedTransaction]:
    """
    Parse an SMS string. Returns a ParsedTransaction dict or None
    if the SMS does not look like a bank/UPI transaction.
    """
    if not body or len(body.strip()) < 10:
        return None

    if not re.search(r"(?:INR|Rs\.?|₹|debited|credited|UPI|NEFT|IMPS)", body, re.IGNORECASE):
        return None

    amount = _extract_amount(body)
    if amount is None or amount <= 0:
        return None

    tx_type = _detect_type(body)
    if tx_type is None:
        return None

    merchant    = _extract_merchant(body)
    description = _build_description(merchant, tx_type, body)

    return ParsedTransaction(
        amount=round(amount, 2),
        type=tx_type,
        description=description,
        merchant=merchant,
        raw_sms=body[:200],
    )