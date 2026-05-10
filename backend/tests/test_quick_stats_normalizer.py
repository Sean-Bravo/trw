"""
Tests for backend/services/quick_stats_normalizer.py — the adapter between
the engine's UniversalRecord (Koinly-format) dicts and generate_quick_stats's
{type, date, asset} contract.

Key invariants tested:
  * Token mapping: buy/sell/transfer (with convert→buy, earn→transfer).
  * Fallback: unrecognized descriptions become 'transfer' AND emit a warn-level log.
  * Sum-to-N: sum(buy + sell + transfer) == len(records);
              count(fee)                  == count(records with Fee Amount > 0).
  * Fee handling: synthetic fee record only when Fee Amount > 0; None/empty/"" skip.
  * Asset picker prefers non-fiat side.
  * Date passthrough survives mixed None/ISO entries in downstream date_range.
"""

import sys
import os
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services"))

from quick_stats_normalizer import (  # noqa: E402
    normalize_for_stats,
    normalize_records,
    count_fees,
    _infer_type,
    _pick_asset,
)
from ai_insights import generate_quick_stats  # noqa: E402


def _record(**overrides):
    """Build a UniversalRecord-shaped dict with sensible defaults."""
    base = {
        "Date": "2024-06-01T12:00:00Z",
        "Sent Amount": 0,
        "Sent Currency": "USD",
        "Received Amount": 1.0,
        "Received Currency": "BTC",
        "Fee Amount": 0,
        "Fee Currency": "USD",
        "Description": "Coinbase buy",
    }
    base.update(overrides)
    return base


# ---------- Type inference ----------

class TestInferType:
    def test_buy_tokens(self):
        for desc in ("Coinbase buy", "Bought 1 ETH", "Crypto purchase", "Convert BTC->ETH"):
            assert _infer_type(desc) == "buy", f"failed on {desc!r}"

    def test_sell_tokens(self):
        for desc in ("Coinbase sell", "Sold 0.5 BTC"):
            assert _infer_type(desc) == "sell", f"failed on {desc!r}"

    def test_transfer_tokens(self):
        for desc in (
            "Coinbase send", "Sent ETH", "Coinbase receive", "Received DOGE",
            "Kraken deposit", "Coinbase withdrawal", "Withdraw to wallet",
            "Transfer to cold storage", "Staking reward", "Income payment",
            "Stake ETH", "Airdrop UNI", "Mining payout", "Coinbase Earn",
            "Learn reward", "Interest accrual",
        ):
            assert _infer_type(desc) == "transfer", f"failed on {desc!r}"

    def test_convert_maps_to_buy_tax_correct(self):
        # Coinbase Convert is a sell+buy pair; the *received* asset is the
        # focal one — counting it as a buy reflects what the user got and
        # keeps the dashboard surface honest about taxable events.
        assert _infer_type("Coinbase convert") == "buy"

    def test_unknown_falls_back_to_transfer(self):
        assert _infer_type("Some weird description") == "transfer"
        assert _infer_type("") == "transfer"
        assert _infer_type(None) == "transfer"

    def test_unknown_logs_warning(self, caplog):
        caplog.set_level(logging.WARNING, logger="quick_stats_normalizer")
        _infer_type("xyzzy quibble")
        assert any("no token matched" in r.message for r in caplog.records)
        assert any("xyzzy quibble" in (r.getMessage() or "") for r in caplog.records)

    def test_recognized_does_not_log(self, caplog):
        caplog.set_level(logging.WARNING, logger="quick_stats_normalizer")
        _infer_type("Coinbase buy")
        assert not any("no token matched" in r.message for r in caplog.records)


# ---------- Asset picker ----------

class TestPickAsset:
    def test_prefers_received_when_non_fiat(self):
        r = _record(Sent_Currency="USD", Received_Currency="BTC")
        # passing through dict to use real keys
        assert _pick_asset({"Sent Currency": "USD", "Received Currency": "BTC"}) == "BTC"

    def test_prefers_sent_when_received_is_fiat(self):
        assert _pick_asset({"Sent Currency": "ETH", "Received Currency": "USD"}) == "ETH"

    def test_returns_received_when_both_fiat_or_empty(self):
        assert _pick_asset({"Sent Currency": "USD", "Received Currency": "EUR"}) == "EUR"
        assert _pick_asset({"Sent Currency": "", "Received Currency": ""}) == ""


# ---------- Single-record normalize ----------

class TestNormalizeForStats:
    def test_emits_type_date_asset(self):
        result = normalize_for_stats(_record(Description="Coinbase sell"))
        assert result == {
            "type": "sell",
            "date": "2024-06-01T12:00:00Z",
            "asset": "BTC",
        }

    def test_missing_date_is_none(self):
        r = _record()
        del r["Date"]
        assert normalize_for_stats(r)["date"] is None

    def test_empty_string_date_is_none(self):
        assert normalize_for_stats(_record(Date=""))["date"] is None


# ---------- normalize_records (the big one) ----------

class TestNormalizeRecords:
    """normalize_records is one-to-one with input — fees are NOT emitted as
    synthetic rows (that inflated total_transactions). They're counted
    separately via count_fees() and merged at the call site.
    """

    def test_one_to_one_with_input(self):
        records = [
            _record(Description="Coinbase buy"),
            _record(Description="Coinbase sell"),
            _record(Description="Coinbase send"),
        ]
        out = normalize_records(records)
        assert len(out) == 3
        assert {x["type"] for x in out} == {"buy", "sell", "transfer"}

    def test_fees_do_not_create_extra_rows(self):
        """Reviewer-flagged regression: synthetic fee rows used to inflate
        total_transactions. Confirm that's gone."""
        records = [
            _record(Description="Coinbase buy",  **{"Fee Amount": 1.5}),
            _record(Description="Coinbase sell", **{"Fee Amount": 0.20}),
            _record(Description="Coinbase send", **{"Fee Amount": 0}),
        ]
        assert len(normalize_records(records)) == len(records) == 3


class TestCountFees:
    def test_counts_only_non_zero_fees(self):
        records = [
            _record(**{"Fee Amount": 1.5}),
            _record(**{"Fee Amount": 0.05}),
            _record(**{"Fee Amount": 0}),
            _record(**{"Fee Amount": None}),
            _record(**{"Fee Amount": ""}),
        ]
        assert count_fees(records) == 2

    def test_string_numeric_fee_counts(self):
        records = [_record(**{"Fee Amount": "0.05"})]
        assert count_fees(records) == 1

    def test_garbage_fee_skipped(self):
        records = [_record(**{"Fee Amount": "not a number"})]
        assert count_fees(records) == 0

    def test_empty_input_returns_zero(self):
        assert count_fees([]) == 0


# ---------- Sum-to-N invariant (the integration assertion) ----------

class TestSumInvariantThroughQuickStats:
    """Simulate the processor call site: feed normalized records to
    generate_quick_stats, then merge fee_count into transaction_types.
    Verify the dashboard chip values AND total_transactions stay honest.
    """

    def test_invariant_on_mixed_batch(self):
        records = [
            _record(Description="Coinbase buy",  **{"Fee Amount": 0.10}),
            _record(Description="Coinbase buy",  **{"Fee Amount": 0}),
            _record(Description="Coinbase sell", **{"Fee Amount": 0.20}),
            _record(Description="Coinbase send", **{"Fee Amount": 0}),
            _record(Description="Coinbase send", **{"Fee Amount": 0.05}),
        ]
        # Simulate processor.py call site
        normalized = normalize_records(records)
        stats = generate_quick_stats(normalized)
        fee_count = count_fees(records)
        if fee_count:
            stats["transaction_types"]["fee"] = fee_count

        types = stats["transaction_types"]

        # total_transactions stays equal to real record count
        assert stats["total_transactions"] == len(records) == 5

        # buy + sell + transfer counts equal len(records) — fees don't inflate
        non_fee_total = (
            types.get("buy", 0)
            + types.get("sell", 0)
            + types.get("transfer", 0)
        )
        assert non_fee_total == len(records), f"got {non_fee_total} from {types}"
        assert types.get("buy") == 2
        assert types.get("sell") == 1
        assert types.get("transfer") == 2

        # fee count equals records with non-zero Fee Amount
        non_zero_fees = sum(1 for r in records if (r.get("Fee Amount") or 0) > 0)
        assert types.get("fee") == non_zero_fees == 3

    def test_no_fees_no_fee_key(self):
        """If no records have fees, the 'fee' key isn't added to the dict."""
        records = [_record(Description="Coinbase buy", **{"Fee Amount": 0})]
        normalized = normalize_records(records)
        stats = generate_quick_stats(normalized)
        fee_count = count_fees(records)
        if fee_count:
            stats["transaction_types"]["fee"] = fee_count
        assert "fee" not in stats["transaction_types"]
        assert stats["total_transactions"] == 1


# ---------- Mixed None/ISO date handling through date_range ----------

class TestMixedDateRange:
    """Reviewer flag: confirm generate_quick_stats's date_range builder
    handles a mix of valid ISO dates and None entries without crashing,
    and computes correct min/max from the present ones.
    """

    def test_all_iso_dates(self):
        records = [
            _record(Date="2024-01-01T00:00:00Z"),
            _record(Date="2024-06-15T12:00:00Z"),
            _record(Date="2024-12-31T23:59:59Z"),
        ]
        stats = generate_quick_stats(normalize_records(records))
        assert stats["date_range"]["start"] == "2024-01-01T00:00:00Z"
        assert stats["date_range"]["end"] == "2024-12-31T23:59:59Z"

    def test_mixed_none_and_iso_skips_none(self):
        records = [
            _record(Date="2024-01-01T00:00:00Z"),
            _record(Date=""),         # → normalized to None
            _record(Date=None),       # already None
            _record(Date="2024-12-31T23:59:59Z"),
        ]
        stats = generate_quick_stats(normalize_records(records))
        # None entries skipped by the existing `if date:` guard in
        # generate_quick_stats; min/max come from ISO entries only.
        assert stats["date_range"]["start"] == "2024-01-01T00:00:00Z"
        assert stats["date_range"]["end"] == "2024-12-31T23:59:59Z"

    def test_all_none_dates_leaves_range_null(self):
        records = [_record(Date=""), _record(Date=None)]
        stats = generate_quick_stats(normalize_records(records))
        assert stats["date_range"]["start"] is None
        assert stats["date_range"]["end"] is None
