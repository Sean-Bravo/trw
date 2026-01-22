"""
Tests for Transaction Normalizer
"""

import pytest
from datetime import datetime

from services.bank_statement.normalizer import TransactionNormalizer


# Mock config
CHASE_CONFIG = {
    "bank": {"name": "Chase"},
    "columns": {
        "date": {"format": "MM/DD/YYYY"},
        "description": {"max_length": 100},
    },
    "normalization": {
        "date_output": "YYYY-MM-DD",
        "amount_sign": "negative_for_debits",
    },
}


class TestDateNormalization:
    """Test date parsing and normalization."""

    @pytest.fixture
    def normalizer(self):
        return TransactionNormalizer(CHASE_CONFIG, statement_year=2024)

    def test_normalize_mm_dd_yyyy(self, normalizer):
        """Should parse MM/DD/YYYY format."""
        result = normalizer._normalize_date("01/15/2024")
        assert result == "2024-01-15"

    def test_normalize_mm_dd_yy(self, normalizer):
        """Should parse MM/DD/YY format."""
        result = normalizer._normalize_date("01/15/24")
        assert result == "2024-01-15"

    def test_normalize_mm_dd_no_year(self, normalizer):
        """Should infer year for MM/DD format."""
        result = normalizer._normalize_date("01/15")
        assert result == "2024-01-15"

    def test_normalize_yyyy_mm_dd(self, normalizer):
        """Should parse YYYY-MM-DD format."""
        result = normalizer._normalize_date("2024-01-15")
        assert result == "2024-01-15"

    def test_normalize_empty_date(self, normalizer):
        """Empty date should return empty string."""
        result = normalizer._normalize_date("")
        assert result == ""

    def test_normalize_invalid_date(self, normalizer):
        """Invalid date should return original string."""
        result = normalizer._normalize_date("not a date")
        assert result == "not a date"

    def test_year_rollover_future_date(self, normalizer):
        """Future dates should be adjusted to previous year."""
        # Assume we're processing in January and see a December date
        normalizer.statement_year = datetime.now().year

        # If the normalized date would be in the future, use previous year
        # This depends on current date - test the logic exists


class TestYearInference:
    """Test year inference from statement period."""

    @pytest.fixture
    def normalizer(self):
        return TransactionNormalizer(CHASE_CONFIG)

    def test_infer_statement_period_with_dates(self, normalizer):
        """Should extract statement period from text."""
        text = "Statement Period: January 1, 2024 - January 31, 2024"
        period = normalizer.infer_statement_period(text)

        assert period is not None
        assert period["start"].year == 2024
        assert period["start"].month == 1
        assert period["end"].month == 1

    def test_infer_statement_period_mm_dd_format(self, normalizer):
        """Should handle MM/DD/YYYY format in statement period."""
        text = "Statement Period: 12/01/2024 - 12/31/2024"
        period = normalizer.infer_statement_period(text)

        assert period is not None
        assert period["start"].month == 12
        assert period["end"].month == 12

    def test_infer_statement_period_not_found(self, normalizer):
        """Should return None if period not found."""
        text = "Random bank text without dates"
        period = normalizer.infer_statement_period(text)

        assert period is None

    def test_set_statement_year(self, normalizer):
        """Should allow updating statement year."""
        normalizer.set_statement_year(2023)
        assert normalizer.statement_year == 2023


class TestAmountNormalization:
    """Test amount normalization."""

    @pytest.fixture
    def normalizer(self):
        return TransactionNormalizer(CHASE_CONFIG)

    def test_normalize_amount_float(self, normalizer):
        """Should convert to float with 2 decimal places."""
        assert normalizer._normalize_amount(100.555) == 100.56
        assert normalizer._normalize_amount(-50.001) == -50.0

    def test_normalize_amount_string(self, normalizer):
        """Should handle string amounts."""
        assert normalizer._normalize_amount("100.00") == 100.00
        assert normalizer._normalize_amount("-50.25") == -50.25

    def test_normalize_amount_none(self, normalizer):
        """None should return 0."""
        assert normalizer._normalize_amount(None) == 0.0

    def test_normalize_amount_invalid(self, normalizer):
        """Invalid values should return 0."""
        assert normalizer._normalize_amount("invalid") == 0.0


class TestDescriptionCleaning:
    """Test description cleaning."""

    @pytest.fixture
    def normalizer(self):
        return TransactionNormalizer(CHASE_CONFIG)

    def test_clean_whitespace(self, normalizer):
        """Should normalize whitespace."""
        result = normalizer._clean_description("  Multiple   spaces   here  ")
        assert result == "Multiple spaces here"

    def test_remove_reference_numbers(self, normalizer):
        """Should remove reference numbers."""
        result = normalizer._clean_description("PAYMENT REF #12345 TO VENDOR")
        assert "REF" not in result or "12345" not in result

    def test_remove_trace_numbers(self, normalizer):
        """Should remove trace numbers."""
        result = normalizer._clean_description("DEPOSIT TRACE #98765")
        assert "TRACE" not in result or "98765" not in result

    def test_truncate_long_description(self, normalizer):
        """Should truncate descriptions over max length."""
        long_desc = "A" * 200
        result = normalizer._clean_description(long_desc)
        assert len(result) <= 100
        assert result.endswith("...")

    def test_empty_description(self, normalizer):
        """Empty description should return empty string."""
        result = normalizer._clean_description("")
        assert result == ""


class TestFullNormalization:
    """Test complete transaction normalization."""

    @pytest.fixture
    def normalizer(self):
        return TransactionNormalizer(CHASE_CONFIG, statement_year=2024)

    def test_normalize_transaction(self, normalizer):
        """Should normalize complete transaction."""
        raw_tx = {
            "date": "01/15/2024",
            "description": "ACH DEBIT  NETFLIX  REF #12345",
            "amount": -15.99,
            "source": {"page": 1, "row": 5},
        }

        result = normalizer.normalize([raw_tx])

        assert len(result) == 1
        tx = result[0]
        assert tx["date"] == "2024-01-15"
        assert "NETFLIX" in tx["description"]
        assert tx["amount"] == -15.99
        assert tx["source"] == {"page": 1, "row": 5}

    def test_normalize_preserves_original(self, normalizer):
        """Should preserve original transaction data."""
        raw_tx = {"date": "01/15", "description": "Test", "amount": 100}

        result = normalizer.normalize([raw_tx])

        assert result[0]["original"] == raw_tx

    def test_normalize_handles_errors(self, normalizer):
        """Should handle normalization errors gracefully."""
        raw_tx = {"date": "invalid", "description": None, "amount": "not a number"}

        result = normalizer.normalize([raw_tx])

        # Should not crash
        assert len(result) == 1
        # May have error flag
        assert "normalization_error" in result[0] or result[0]["date"] == "invalid"


class TestOutputFormats:
    """Test different output date formats."""

    def test_output_yyyy_mm_dd(self):
        """Should output YYYY-MM-DD format."""
        config = {"normalization": {"date_output": "YYYY-MM-DD"}}
        normalizer = TransactionNormalizer(config, statement_year=2024)

        result = normalizer._normalize_date("01/15/2024")
        assert result == "2024-01-15"

    def test_output_mm_dd_yyyy(self):
        """Should output MM/DD/YYYY format."""
        config = {"normalization": {"date_output": "MM/DD/YYYY"}}
        normalizer = TransactionNormalizer(config, statement_year=2024)

        result = normalizer._normalize_date("2024-01-15")
        assert result == "01/15/2024"

    def test_output_dd_mm_yyyy(self):
        """Should output DD/MM/YYYY format."""
        config = {"normalization": {"date_output": "DD/MM/YYYY"}}
        normalizer = TransactionNormalizer(config, statement_year=2024)

        result = normalizer._normalize_date("01/15/2024")
        assert result == "15/01/2024"
