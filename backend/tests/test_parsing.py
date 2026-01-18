"""
Test actual parsing output for all exchange parsers.
Verifies that fixtures produce valid UniversalRecord output.
"""
import pytest
import pandas as pd
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.engine import process_file

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "valid"

# Map fixture names to expected exchange and minimum record count
EXCHANGE_FIXTURES = [
    ("binance_valid.csv", "binance", 3),
    ("coinbase_legacy_valid.csv", "coinbase", 3),
    ("coinbase_2025_valid.csv", "coinbase", 3),
    ("kraken_valid.csv", "kraken", 2),      # Kraken: 1 trade skipped as single-row
    ("kucoin_valid.csv", "kucoin", 3),
    ("bybit_valid.csv", "bybit", 3),
    ("gemini_valid.csv", "gemini", 1),      # Gemini: complex multi-currency format
    ("crypto_com_valid.csv", "crypto.com", 1),  # Crypto.com: staking/lockup filtered
    ("robinhood_valid.csv", "robinhood", 3),
    ("paypal_valid.csv", "paypal", 3),
    ("cashapp_valid.csv", "cashapp", 2),    # CashApp: 1 sale skipped as unknown
    ("bitfinex_valid.csv", "bitfinex", 3),
    ("okx_valid.csv", "okx", 3),
    ("ftx_valid.csv", "ftx", 2),
]


class TestParsingOutput:
    """Test that each parser produces valid output records."""

    @pytest.mark.parametrize("fixture,expected_exchange,min_records", EXCHANGE_FIXTURES)
    def test_parser_produces_records(self, fixture, expected_exchange, min_records):
        """Each fixture should parse into at least min_records UniversalRecords."""
        fixture_path = FIXTURES_DIR / fixture
        if not fixture_path.exists():
            pytest.skip(f"Fixture {fixture} not found")

        with open(fixture_path, "rb") as f:
            data = f.read()

        result = process_file(data)

        # Should succeed
        assert result["success"], f"Parsing failed: {result.get('errors', [])}"

        # Should detect correct exchange
        assert result["meta"]["exchange_detected"].lower() == expected_exchange.lower(), \
            f"Expected {expected_exchange}, got {result['meta']['exchange_detected']}"

        # Should produce records
        records = result["records"]
        assert len(records) >= min_records, \
            f"Expected at least {min_records} records, got {len(records)}"

        # Each record should have required fields (note: spaces in field names)
        for i, record in enumerate(records):
            assert "Date" in record, f"Record {i} missing Date"
            assert record["Date"], f"Record {i} has empty Date"
            # At least one of sent or received should be populated
            has_sent = record.get("Sent Amount") and record.get("Sent Currency")
            has_received = record.get("Received Amount") and record.get("Received Currency")
            assert has_sent or has_received, \
                f"Record {i} has neither sent nor received: {record}"


class TestParsingFields:
    """Test specific field parsing for each exchange."""

    def test_binance_parsing(self):
        """Binance should parse pair, side, price correctly."""
        fixture_path = FIXTURES_DIR / "binance_valid.csv"
        with open(fixture_path, "rb") as f:
            result = process_file(f.read())

        assert result["success"]
        records = result["records"]

        # First record: BUY 0.5 BTC for 22500 USDT
        buy_record = records[0]
        assert buy_record["Received Currency"] == "BTC"
        assert float(buy_record["Received Amount"]) == 0.5
        assert buy_record["Sent Currency"] == "USDT"

    def test_coinbase_parsing(self):
        """Coinbase should handle Buy/Sell/Send types."""
        fixture_path = FIXTURES_DIR / "coinbase_legacy_valid.csv"
        with open(fixture_path, "rb") as f:
            result = process_file(f.read())

        assert result["success"]
        assert len(result["records"]) >= 3

    def test_kraken_parsing(self):
        """Kraken should normalize asset prefixes (XXBT -> BTC)."""
        fixture_path = FIXTURES_DIR / "kraken_valid.csv"
        with open(fixture_path, "rb") as f:
            result = process_file(f.read())

        assert result["success"]
        # Check that XXBT was normalized to BTC
        records = result["records"]
        currencies = set()
        for r in records:
            if r.get("Sent Currency"):
                currencies.add(r["Sent Currency"])
            if r.get("Received Currency"):
                currencies.add(r["Received Currency"])

        # Should not contain Kraken prefixes
        assert "XXBT" not in currencies, "XXBT should be normalized to BTC"
        assert "ZEUR" not in currencies, "ZEUR should be normalized to EUR"


class TestErrorHandling:
    """Test parser error handling."""

    def test_empty_file_handling(self):
        """Empty file should fail gracefully."""
        result = process_file(b"")
        assert not result["success"]

    def test_header_only_handling(self):
        """Header-only file should return zero records."""
        fixture_path = Path(__file__).parent / "fixtures" / "edge_cases" / "header_only.csv"
        if not fixture_path.exists():
            pytest.skip("header_only.csv not found")

        with open(fixture_path, "rb") as f:
            result = process_file(f.read())

        # Should either fail or return 0 records
        if result["success"]:
            assert len(result["records"]) == 0

    def test_malformed_data_handling(self):
        """Malformed data should produce errors, not crash."""
        malformed = b"Date,Amount\n2024-01-01,not_a_number\n"
        result = process_file(malformed)
        # Should not crash - either fails gracefully or parses with errors
        assert isinstance(result, dict)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
