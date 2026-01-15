#!/usr/bin/env python3
"""
Test Suite for Exchange CSV Detection

Tests the fingerprinting and engine detection logic against:
1. Valid exchange files (golden master - should detect correctly)
2. Ambiguous files (should NOT match any exchange)
3. Edge cases (encoding, delimiters, empty files)

Run: pytest tests/test_exchange_detection.py -v
"""

import os
import sys
import pytest
import pandas as pd

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.fingerprinting import detect_exchange_from_headers
from services.engine import ParserRegistry

# Fixture directories
FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
VALID_DIR = os.path.join(FIXTURES_DIR, "valid")
AMBIGUOUS_DIR = os.path.join(FIXTURES_DIR, "ambiguous")
EDGE_CASES_DIR = os.path.join(FIXTURES_DIR, "edge_cases")


def load_csv_flexible(filepath: str) -> pd.DataFrame:
    """Load CSV with flexible parsing (handles different delimiters, encodings)."""
    # Try different encodings
    for encoding in ["utf-8", "utf-8-sig", "latin-1"]:
        try:
            # First, try to detect delimiter
            with open(filepath, "r", encoding=encoding) as f:
                first_lines = f.read(2048)

            # Skip metadata rows (like Coinbase 2025 format)
            lines = first_lines.split("\n")
            header_row = 0
            for i, line in enumerate(lines):
                line_lower = line.lower().strip()
                # Skip empty lines and metadata
                if not line_lower or line_lower.startswith("transactions") or line_lower.startswith('"user'):
                    header_row = i + 1
                    continue
                # Found likely header row
                if any(kw in line_lower for kw in ["date", "time", "timestamp", "type", "amount"]):
                    header_row = i
                    break

            # Detect delimiter
            sample = lines[header_row] if header_row < len(lines) else lines[0]
            if "\t" in sample:
                delimiter = "\t"
            elif ";" in sample:
                delimiter = ";"
            else:
                delimiter = ","

            df = pd.read_csv(
                filepath,
                encoding=encoding,
                delimiter=delimiter,
                skiprows=header_row if header_row > 0 else None,
                on_bad_lines="skip",
            )
            return df

        except Exception:
            continue

    # Last resort: just try default
    return pd.read_csv(filepath, on_bad_lines="skip")


class TestValidExchangeDetection:
    """Test that valid exchange files are correctly detected."""

    # Expected mappings: filename -> expected exchange name
    EXPECTED_DETECTIONS = {
        "binance_valid": "binance",
        "coinbase_legacy_valid": "coinbase",
        "coinbase_2025_valid": "coinbase",
        "kraken_valid": "kraken",
        "kucoin_valid": "kucoin",
        "bybit_valid": "bybit",
        "gemini_valid": "gemini",
        "crypto_com_valid": "crypto.com",
        "robinhood_valid": "robinhood",
        "paypal_valid": "paypal",
        "cashapp_valid": "cashapp",
        "bitfinex_valid": "bitfinex",
        "okx_valid": "okx",
        "ftx_valid": "ftx",
    }

    @pytest.fixture
    def parser_registry(self):
        """Create parser registry instance."""
        return ParserRegistry()

    @pytest.mark.parametrize("filename,expected", EXPECTED_DETECTIONS.items())
    def test_fingerprinting_detection(self, filename, expected):
        """Test detection using fingerprinting.py."""
        filepath = os.path.join(VALID_DIR, f"{filename}.csv")
        if not os.path.exists(filepath):
            pytest.skip(f"Fixture not found: {filepath}")

        df = load_csv_flexible(filepath)
        result = detect_exchange_from_headers(df)

        assert result is not None, f"Failed to detect {filename}"
        # Normalize both for comparison (lowercase, no spaces, no dots)
        result_normalized = result.lower().replace(" ", "").replace(".", "")
        expected_normalized = expected.lower().replace(" ", "").replace(".", "")
        assert result_normalized == expected_normalized, f"Expected {expected}, got {result}"

    @pytest.mark.parametrize("filename,expected", EXPECTED_DETECTIONS.items())
    def test_engine_detection(self, filename, expected, parser_registry):
        """Test detection using engine.py ParserRegistry."""
        filepath = os.path.join(VALID_DIR, f"{filename}.csv")
        if not os.path.exists(filepath):
            pytest.skip(f"Fixture not found: {filepath}")

        df = load_csv_flexible(filepath)
        result = parser_registry.detect_exchange(df)

        # Normalize result for comparison
        if result:
            result = result.lower().replace(" ", "").replace(".", "")
            expected_normalized = expected.lower().replace(" ", "").replace(".", "")
            # Handle crypto.com -> cryptocom mapping
            if expected_normalized == "cryptocom":
                assert result in ["cryptocom", "crypto.com", "cryptoocm"], f"Expected {expected}, got {result}"
            else:
                assert result == expected_normalized, f"Expected {expected}, got {result}"
        else:
            pytest.fail(f"Engine failed to detect {filename}")


class TestAmbiguousFileRejection:
    """Test that ambiguous/non-crypto files are NOT detected as exchanges."""

    AMBIGUOUS_FILES = [
        "bank_statement",
        "accounting_export",
        "stock_trades",
        "sales_data",
        "invoices",
        "banking_transactions",
        "fake_coinbase",
    ]

    @pytest.fixture
    def parser_registry(self):
        """Create parser registry instance."""
        return ParserRegistry()

    @pytest.mark.parametrize("filename", AMBIGUOUS_FILES)
    def test_fingerprinting_rejects_ambiguous(self, filename):
        """Test that fingerprinting returns None/Unknown for ambiguous files."""
        filepath = os.path.join(AMBIGUOUS_DIR, f"{filename}.csv")
        if not os.path.exists(filepath):
            pytest.skip(f"Fixture not found: {filepath}")

        df = load_csv_flexible(filepath)
        result = detect_exchange_from_headers(df)

        # Should be None or "Unknown"
        assert result is None or result == "Unknown", f"False positive: {filename} detected as {result}"

    @pytest.mark.parametrize("filename", AMBIGUOUS_FILES)
    def test_engine_rejects_ambiguous(self, filename, parser_registry):
        """Test that engine returns None for ambiguous files."""
        filepath = os.path.join(AMBIGUOUS_DIR, f"{filename}.csv")
        if not os.path.exists(filepath):
            pytest.skip(f"Fixture not found: {filepath}")

        df = load_csv_flexible(filepath)
        result = parser_registry.detect_exchange(df)

        assert result is None, f"False positive: {filename} detected as {result}"


class TestEdgeCases:
    """Test handling of edge cases."""

    @pytest.fixture
    def parser_registry(self):
        """Create parser registry instance."""
        return ParserRegistry()

    def test_empty_file(self):
        """Test handling of empty file."""
        filepath = os.path.join(EDGE_CASES_DIR, "empty_file.csv")
        if not os.path.exists(filepath):
            pytest.skip("Fixture not found")

        # Should not crash, should return empty or raise gracefully
        try:
            df = pd.read_csv(filepath)
            result = detect_exchange_from_headers(df)
            # Empty file should not match anything
            assert result is None or result == "Unknown"
        except pd.errors.EmptyDataError:
            pass  # Expected for empty file

    def test_header_only(self):
        """Test file with headers but no data."""
        filepath = os.path.join(EDGE_CASES_DIR, "header_only.csv")
        if not os.path.exists(filepath):
            pytest.skip("Fixture not found")

        df = load_csv_flexible(filepath)
        # Should still detect based on headers alone
        result = detect_exchange_from_headers(df)
        # May or may not match - just shouldn't crash
        assert result is None or isinstance(result, str)

    def test_utf8_bom(self):
        """Test UTF-8 BOM encoded file."""
        filepath = os.path.join(EDGE_CASES_DIR, "utf8_bom_coinbase.csv")
        if not os.path.exists(filepath):
            pytest.skip("Fixture not found")

        df = load_csv_flexible(filepath)
        result = detect_exchange_from_headers(df)
        assert result is not None and result.lower() == "coinbase"

    def test_mixed_case_headers(self):
        """Test detection with mixed case headers."""
        filepath = os.path.join(EDGE_CASES_DIR, "mixed_case_headers.csv")
        if not os.path.exists(filepath):
            pytest.skip("Fixture not found")

        df = load_csv_flexible(filepath)
        result = detect_exchange_from_headers(df)
        # Should detect Coinbase despite mixed case
        assert result is not None and result.lower() == "coinbase"

    def test_large_file(self, parser_registry):
        """Test detection on large file (100 rows)."""
        filepath = os.path.join(EDGE_CASES_DIR, "large_file_coinbase.csv")
        if not os.path.exists(filepath):
            pytest.skip("Fixture not found")

        df = load_csv_flexible(filepath)

        # Test fingerprinting
        result = detect_exchange_from_headers(df)
        assert result is not None and result.lower() == "coinbase"

        # Test engine
        result = parser_registry.detect_exchange(df)
        assert result is not None and result.lower() == "coinbase"

    def test_multiple_blank_lines(self):
        """Test file with multiple blank lines before headers (like Coinbase 2025)."""
        filepath = os.path.join(EDGE_CASES_DIR, "multiple_blank_lines.csv")
        if not os.path.exists(filepath):
            pytest.skip("Fixture not found")

        df = load_csv_flexible(filepath)
        result = detect_exchange_from_headers(df)
        assert result is not None and result.lower() == "coinbase"


class TestCoinbaseRobinhoodDistinction:
    """
    Specific test for Coinbase vs Robinhood distinction.

    Both have similar columns ('quantity transacted' vs 'quantity'),
    but should be distinguished by:
    - Coinbase: 'transaction type', 'asset', 'timestamp'
    - Robinhood: 'activity date', 'instrument', 'trans code'
    """

    def test_coinbase_not_detected_as_robinhood(self):
        """Coinbase files should NOT be detected as Robinhood."""
        for filename in ["coinbase_legacy_valid", "coinbase_2025_valid"]:
            filepath = os.path.join(VALID_DIR, f"{filename}.csv")
            if not os.path.exists(filepath):
                continue

            df = load_csv_flexible(filepath)
            result = detect_exchange_from_headers(df)

            assert result is not None, f"{filename} not detected"
            assert result.lower() != "robinhood", f"{filename} incorrectly detected as Robinhood"
            assert result.lower() == "coinbase", f"{filename} should be Coinbase, got {result}"

    def test_robinhood_not_detected_as_coinbase(self):
        """Robinhood files should NOT be detected as Coinbase."""
        filepath = os.path.join(VALID_DIR, "robinhood_valid.csv")
        if not os.path.exists(filepath):
            pytest.skip("Fixture not found")

        df = load_csv_flexible(filepath)
        result = detect_exchange_from_headers(df)

        assert result is not None, "Robinhood not detected"
        assert result.lower() != "coinbase", "Robinhood incorrectly detected as Coinbase"
        assert result.lower() == "robinhood", f"Should be Robinhood, got {result}"


class TestParserRegistry:
    """Test ParserRegistry functionality."""

    @pytest.fixture
    def registry(self):
        return ParserRegistry()

    def test_all_parsers_registered(self, registry):
        """Verify all expected parsers are registered."""
        expected_parsers = [
            "binance", "coinbase", "kraken", "kucoin", "bybit",
            "gemini", "crypto.com", "ftx", "bitfinex", "okx",
            "robinhood", "paypal", "cashapp"
        ]

        for parser_name in expected_parsers:
            parser = registry.get_parser(parser_name)
            assert parser is not None, f"Parser not found: {parser_name}"

    def test_get_nonexistent_parser(self, registry):
        """Getting a non-existent parser should return None."""
        result = registry.get_parser("nonexistent_exchange")
        assert result is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
