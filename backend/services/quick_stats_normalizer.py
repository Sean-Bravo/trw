"""
Adapter: UniversalRecord (Koinly-format dict) -> {type, date, asset} for quick_stats.

The parser engine emits tax-software-formatted records keyed by Koinly columns
(Date, Sent Amount, Sent Currency, Received Amount, Received Currency,
Fee Amount, Fee Currency, Description). generate_quick_stats expects records
keyed by {type, date, asset}. Rather than couple generate_quick_stats to
parser output (which would silently degrade as parsers evolve), this small
adapter sits between them so generate_quick_stats keeps its clean shape contract.

Why this exists: the dashboard breakdown chips (Buys / Sells / Transfers / Fees)
read from quick_stats.transaction_types. When AI insights are capped or fail,
those chips are the only source — without normalization they all show 0 because
no record has a "type" key.
"""
import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


_BUY_TOKENS = ("buy", "bought", "purchase", "convert")
_SELL_TOKENS = ("sell", "sold")
_TRANSFER_TOKENS = (
    "send", "sent", "receive", "received",
    "deposit", "withdrawal", "withdraw", "transfer",
    "reward", "income", "stake", "staking", "airdrop",
    "interest", "mining", "earn",
)

_FIAT = frozenset({"USD", "EUR", "GBP", "CAD", "AUD", "JPY"})


def _infer_type(description: str) -> str:
    """Map a Description string to one of: buy, sell, transfer.

    Fallback is 'transfer' (movements of funds dominate the long tail of
    unrecognized descriptions; safer default than dropping to 'unknown').
    Logs at warn level when the fallback fires so parser drift is visible
    in CloudWatch without polluting the dashboard.
    """
    desc = (description or "").lower()
    if any(tok in desc for tok in _BUY_TOKENS):
        return "buy"
    if any(tok in desc for tok in _SELL_TOKENS):
        return "sell"
    if any(tok in desc for tok in _TRANSFER_TOKENS):
        return "transfer"
    logger.warning(
        "quick_stats_normalizer: no token matched, falling back to 'transfer'. "
        "description=%r",
        description,
    )
    return "transfer"


def _pick_asset(record: Dict[str, Any]) -> str:
    """Choose the non-fiat side of the transaction as the 'asset'.

    Records have both Sent Currency and Received Currency; for a buy/sell
    one side is USD. We prefer the non-fiat ticker.
    """
    sent = (record.get("Sent Currency") or "").strip()
    received = (record.get("Received Currency") or "").strip()
    if received and received not in _FIAT:
        return received
    if sent and sent not in _FIAT:
        return sent
    return received or sent or ""


def normalize_for_stats(record: Dict[str, Any]) -> Dict[str, Any]:
    """Return a {type, date, asset} dict from one UniversalRecord-shaped row."""
    return {
        "type": _infer_type(record.get("Description", "")),
        "date": record.get("Date") or None,
        "asset": _pick_asset(record),
    }


def _fee_record_for(record: Dict[str, Any]) -> Dict[str, Any] | None:
    """If the record has a non-zero Fee Amount, return a synthetic 'fee' row;
    otherwise None. Returning a separate row lets generate_quick_stats count
    fees alongside other types without changing its shape contract.
    """
    fee_amount = record.get("Fee Amount")
    if fee_amount is None or fee_amount == "":
        return None
    try:
        if float(fee_amount) > 0:
            return {
                "type": "fee",
                "date": record.get("Date") or None,
                "asset": (record.get("Fee Currency") or "").strip(),
            }
    except (ValueError, TypeError):
        return None
    return None


def normalize_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Vectorized form: apply normalize_for_stats over a list, plus emit a
    synthetic 'fee' record alongside whenever Fee Amount > 0.

    Output length is len(records) + count(records with non-zero Fee Amount).
    Sum-to-N invariant on transaction_types becomes:
        sum(buy + sell + transfer) == len(records)
        count(fee)                  == count of records with non-zero Fee Amount
    """
    out: List[Dict[str, Any]] = []
    for r in records:
        out.append(normalize_for_stats(r))
        fee_row = _fee_record_for(r)
        if fee_row is not None:
            out.append(fee_row)
    return out
