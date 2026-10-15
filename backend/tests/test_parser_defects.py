"""
Regression tests for the parser defects the Oct 13 shadow eval surfaced
(PR #120 eval comment): Opus 4.7 and Fable 5.1 disagreed on four fixtures
and both were describing real parser output.

Each class pins the exact amounts the Koinly-format records must carry:
fiat side excluding the fee, Fee Amount carrying it, and never a crypto
quantity standing in for a fiat amount (or the other way round).
"""

import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.engine import process_file, BinanceParser  # noqa: E402

FIXTURES = Path(__file__).parent / "fixtures" / "valid"


def _parse(data: bytes):
    result = process_file(data)
    assert result["success"], result.get("errors")
    return result


def _records(name: str):
    with open(FIXTURES / name, "rb") as f:
        return _parse(f.read())["records"]


def _by_desc(records, needle):
    return [r for r in records if needle in r["Description"].lower()]


# ---------------------------------------------------------------------------
# Coinbase — legacy header mapped; fee no longer double-counted (both formats)
# ---------------------------------------------------------------------------

class TestCoinbase:

    def test_legacy_buy_and_sell_carry_the_subtotal_as_the_fiat_side(self):
        records = _records("coinbase_legacy_valid.csv")
        buy, = _by_desc(records, "buy")
        sell, = _by_desc(records, "sell")

        # Buy 0.1 BTC: Subtotal 4000, Total 4010, fee 10
        assert buy["Sent Currency"] == "USD" and float(buy["Sent Amount"]) == 4000.0
        assert buy["Received Currency"] == "BTC" and float(buy["Received Amount"]) == 0.1
        assert float(buy["Fee Amount"]) == 10.0 and buy["Fee Currency"] == "USD"

        # Sell 1.5 ETH: Subtotal 3300, Total 3290, fee 10 — proceeds are no longer 0
        assert sell["Sent Currency"] == "ETH" and float(sell["Sent Amount"]) == 1.5
        assert sell["Received Currency"] == "USD" and float(sell["Received Amount"]) == 3300.0
        assert float(sell["Fee Amount"]) == 10.0

    def test_2025_format_no_longer_double_counts_the_fee(self):
        records = _records("coinbase_2025_valid.csv")
        buy, = _by_desc(records, "buy")
        sell, = _by_desc(records, "sell")
        assert float(buy["Sent Amount"]) == 4000.0      # was 4020 (total + fee)
        assert float(sell["Received Amount"]) == 3300.0  # was 3280 (total - fee)

    def test_crypto_quantity_is_never_used_as_the_fiat_amount(self):
        # Legacy export without Subtotal and Total: fall back to spot price × quantity.
        csv = (
            b"Timestamp,Transaction Type,Asset,Quantity Transacted,Spot Price at Transaction,Fees and/or Spread\n"
            b"2024-01-01 10:00:00 UTC,Buy,BTC,0.1,40000.00,10.00\n"
        )
        buy, = _parse(csv)["records"]
        assert float(buy["Sent Amount"]) == 4000.0
        assert buy["Sent Currency"] == "USD"

    def test_trade_without_any_fiat_amount_is_a_row_error_not_a_zero(self):
        csv = (
            b"Timestamp,Transaction Type,Asset,Quantity Transacted,Fees and/or Spread\n"
            b"2024-01-01 10:00:00 UTC,Buy,BTC,0.1,10.00\n"
            b"2024-01-02 10:00:00 UTC,Send,BTC,0.05,0.00\n"
        )
        result = process_file(csv)
        assert result["success"]
        assert len(result["records"]) == 1                      # the send survives
        assert result["records"][0]["Description"] == "Coinbase send"
        assert any("no fiat amount" in e["message"] for e in result["errors"])


# ---------------------------------------------------------------------------
# Crypto.com — fiat amount read; sale kept; lockups counted, not silently dropped
# ---------------------------------------------------------------------------

class TestCryptoDotCom:

    def test_fixture_yields_the_buy_and_the_sale_with_fiat_amounts(self):
        result = _parse((FIXTURES / "crypto_com_valid.csv").read_bytes())
        records = result["records"]
        assert len(records) == 2, records
        buy, = _by_desc(records, "purchase")
        sell, = _by_desc(records, "sell")

        assert buy["Received Currency"] == "BTC" and float(buy["Received Amount"]) == 0.1
        assert buy["Sent Currency"] == "USD" and float(buy["Sent Amount"]) == 4500.0   # was 0.0

        assert sell["Sent Currency"] == "ETH" and float(sell["Sent Amount"]) == 2.0
        assert sell["Received Currency"] == "USD" and float(sell["Received Amount"]) == 5000.0

    def test_lockups_are_skipped_with_one_visible_warning(self):
        result = _parse((FIXTURES / "crypto_com_valid.csv").read_bytes())
        lock_warnings = [e for e in result["errors"] if "lock/unlock" in e["message"]]
        assert len(lock_warnings) == 1
        assert lock_warnings[0]["severity"] == "warning"
        assert "skipped 1 lock/unlock row" in lock_warnings[0]["message"]

    def test_native_amount_is_the_fallback_when_the_usd_column_is_absent(self):
        csv = (
            b"Timestamp (UTC),Transaction Description,Currency,Amount,To Currency,To Amount,Native Currency,Native Amount,Transaction Kind\n"
            b"2024-01-01 10:00:00,Buy BTC,BTC,0.1,,,EUR,4100.00,crypto_purchase\n"
            b"2024-01-02 10:00:00,Sell ETH,ETH,-1.0,EUR,2300.00,EUR,2300.00,crypto_viban_exchange\n"
        )
        buy, sell = _parse(csv)["records"]
        assert buy["Sent Currency"] == "EUR" and float(buy["Sent Amount"]) == 4100.0
        assert sell["Received Currency"] == "EUR" and float(sell["Received Amount"]) == 2300.0

    def test_purchase_without_any_fiat_amount_is_a_row_error(self):
        csv = (
            b"Timestamp (UTC),Transaction Description,Currency,Amount,To Currency,To Amount,Native Currency,Native Amount,Transaction Kind\n"
            b"2024-01-01 10:00:00,Buy BTC,BTC,0.1,,,USD,,crypto_purchase\n"
            b"2024-01-03 09:00:00,Deposit,BTC,0.2,,,USD,9000,crypto_deposit\n"
        )
        result = process_file(csv)
        assert result["success"]
        assert [r["Description"] for r in result["records"]] == ["Crypto.com deposit"]
        assert any("no fiat amount" in e["message"] for e in result["errors"])


# ---------------------------------------------------------------------------
# PayPal — never a fabricated crypto quantity; fee kept separate
# ---------------------------------------------------------------------------

class TestPayPal:

    def test_fixture_fiat_sides_are_gross_and_quantities_are_blank_with_warnings(self):
        result = _parse((FIXTURES / "paypal_valid.csv").read_bytes())
        records = result["records"]
        assert len(records) == 3
        for r in records:
            fiat = float(r["Sent Amount"]) if r["Sent Currency"] == "USD" else float(r["Received Amount"])
            crypto = float(r["Received Amount"]) if r["Sent Currency"] == "USD" else float(r["Sent Amount"])
            assert crypto == 0.0, r                      # unknown — never the USD figure
            assert crypto != fiat

        buy1, sell, buy2 = records
        assert float(buy1["Sent Amount"]) == 100.0 and buy1["Received Currency"] == "BTC"
        assert float(sell["Received Amount"]) == 500.0 and float(sell["Fee Amount"]) == 10.0   # was net 490
        assert float(buy2["Sent Amount"]) == 250.0 and float(buy2["Fee Amount"]) == 2.5        # was 252.5

        warnings = [e for e in result["errors"] if "no crypto quantity" in e["message"]]
        assert len(warnings) == 3
        assert all(w["severity"] == "warning" for w in warnings)

    def test_quantity_column_is_honoured_and_fiat_currency_column_is_understood(self):
        # PayPal's own export: Currency is the fiat, the coin is in the Type.
        csv = (
            b"Date,Time,TimeZone,Name,Type,Status,Currency,Gross,Fee,Net,Quantity\n"
            b"01/01/2024,12:00:00,PST,PayPal Crypto,Crypto Bitcoin Buy,Completed,USD,-100.00,2.50,-102.50,0.0025\n"
            b"01/15/2024,14:30:00,PST,PayPal Crypto,Crypto Bitcoin Sell,Completed,USD,500.00,10.00,490.00,0.0120\n"
        )
        result = _parse(csv)
        buy, sell = result["records"]
        assert buy["Received Currency"] == "BTC" and float(buy["Received Amount"]) == 0.0025
        assert float(buy["Sent Amount"]) == 100.0 and float(buy["Fee Amount"]) == 2.5
        assert sell["Sent Currency"] == "BTC" and float(sell["Sent Amount"]) == 0.012
        assert float(sell["Received Amount"]) == 500.0
        assert not any("no crypto quantity" in e["message"] for e in result["errors"])

    def test_transfer_without_quantity_is_a_row_error_not_an_empty_record(self):
        csv = (
            b"Date,Time,TimeZone,Name,Type,Status,Currency,Gross,Fee,Net\n"
            b"01/01/2024,12:00:00,PST,PayPal Crypto,Crypto Bitcoin Buy,Completed,USD,-100.00,0.00,-100.00\n"
            b"01/02/2024,12:00:00,PST,PayPal Crypto,Crypto Bitcoin Send,Completed,USD,-50.00,0.00,-50.00\n"
        )
        result = process_file(csv)
        assert result["success"]
        assert len(result["records"]) == 1
        assert any("send" in e["message"] and "no crypto quantity" in e["message"] for e in result["errors"])

    def test_module_source_has_no_fabricated_quantity(self):
        src = open(os.path.join(os.path.dirname(__file__), "..", "services", "engine.py"), encoding="utf-8").read()
        assert "gross * 0.95" not in src


# ---------------------------------------------------------------------------
# Binance — embedded units parsed; fee coin follows the side when no column
# ---------------------------------------------------------------------------

class TestBinance:

    def test_split_unit(self):
        assert BinanceParser.split_unit("0.5BTC") == (0.5, "BTC")
        assert BinanceParser.split_unit("22,500.00USDT") == (22500.0, "USDT")
        assert BinanceParser.split_unit("0.0005") == (0.0005, "")
        assert BinanceParser.split_unit(10.0) == (10.0, "")
        assert BinanceParser.split_unit(None) == (0.0, "")
        assert BinanceParser.split_unit("abc") == (0.0, "")

    def test_fee_coin_defaults_to_the_received_asset_per_side(self):
        records = _records("binance_valid.csv")
        buy_btc, sell_eth, buy_sol = records
        assert buy_btc["Fee Currency"] == "BTC"       # buy: fee in the base coin
        assert sell_eth["Fee Currency"] == "USDT"     # sell: fee in the quote coin (was ETH)
        assert buy_sol["Fee Currency"] == "SOL"
        assert buy_btc["Sent Currency"] == "USDT" and float(buy_btc["Sent Amount"]) == 22500.0

    def test_real_export_with_units_in_cells_parses(self):
        csv = (
            b"Date(UTC),Pair,Side,Price,Executed,Amount,Fee\n"
            b"2024-01-01 12:00:00,BTCUSDT,BUY,45000.00,0.5BTC,22500.00USDT,0.0005BTC\n"
            b"2024-01-02 14:30:00,ETHUSDT,SELL,2500.00,10.0ETH,25000.00USDT,25.00USDT\n"
        )
        buy, sell = _parse(csv)["records"]
        assert float(buy["Received Amount"]) == 0.5 and buy["Received Currency"] == "BTC"
        assert float(buy["Fee Amount"]) == 0.0005 and buy["Fee Currency"] == "BTC"
        assert float(sell["Sent Amount"]) == 10.0 and float(sell["Received Amount"]) == 25000.0
        assert float(sell["Fee Amount"]) == 25.0 and sell["Fee Currency"] == "USDT"

    def test_fee_coin_column_wins_over_the_default(self):
        csv = (
            b"Date(UTC),Pair,Side,Price,Executed,Amount,Fee,Fee Coin\n"
            b"2024-01-01 12:00:00,BTCUSDT,BUY,45000.00,0.5,22500.00,0.01,BNB\n"
        )
        buy, = _parse(csv)["records"]
        assert buy["Fee Currency"] == "BNB" and float(buy["Fee Amount"]) == 0.01

    def test_quote_amount_column_no_longer_collides_with_executed(self):
        import pandas as pd
        df = pd.read_csv(FIXTURES / "binance_valid.csv")
        cols = list(BinanceParser().normalize_columns(df).columns)
        assert cols.count("amount") == 1 and "quote_amount" in cols
