"""
Tests for Transaction Extractor
"""

import pytest
from io import BytesIO
from unittest.mock import Mock, patch, MagicMock
import re

from services.bank_statement.extractor import TransactionExtractor


# Mock bank config
CHASE_CONFIG = {
    "bank": {"name": "Chase"},
    "columns": {
        "date": {"names": ["Date"], "format": "MM/DD/YYYY"},
        "description": {"names": ["Description"], "max_length": 255, "multiline": True},
        "amount": {"names": ["Amount"], "debit_credit_mode": False},
    },
    "table_detection": {
        "header_row_keywords": ["Date", "Description", "Amount", "Balance"],
        "skip_rows_containing": ["Opening Balance", "Closing Balance", "TOTALS"],
    },
}

DEBIT_CREDIT_CONFIG = {
    "bank": {"name": "TestBank"},
    "columns": {
        "date": {"names": ["Date"], "format": "MM/DD/YYYY"},
        "description": {"names": ["Description"]},
        "amount": {"debit_credit_mode": True},
        "debit": {"names": ["Withdrawals", "Debit"]},
        "credit": {"names": ["Deposits", "Credit"]},
    },
    "table_detection": {
        "header_row_keywords": ["Date", "Description", "Withdrawals", "Deposits"],
        "skip_rows_containing": ["Total"],
    },
}


class TestDatePatternBuilding:
    """Test date pattern regex building."""

    def test_mm_dd_yyyy_pattern(self):
        """Should build pattern for MM/DD/YYYY format."""
        config = {"columns": {"date": {"format": "MM/DD/YYYY"}}}
        extractor = TransactionExtractor(config)

        assert extractor.date_pattern.match("01/15/2024")
        assert extractor.date_pattern.match("1/5/2024")
        assert not extractor.date_pattern.match("2024-01-15")

    def test_mm_dd_pattern(self):
        """Should build pattern for MM/DD format (no year)."""
        config = {"columns": {"date": {"format": "MM/DD"}}}
        extractor = TransactionExtractor(config)

        assert extractor.date_pattern.match("01/15")
        assert extractor.date_pattern.match("1/5")

    def test_yyyy_mm_dd_pattern(self):
        """Should build pattern for YYYY-MM-DD format."""
        config = {"columns": {"date": {"format": "YYYY-MM-DD"}}}
        extractor = TransactionExtractor(config)

        assert extractor.date_pattern.match("2024-01-15")
        assert extractor.date_pattern.match("2024-1-5")


class TestAmountParsing:
    """Test amount cleaning and parsing."""

    @pytest.fixture
    def extractor(self):
        return TransactionExtractor(CHASE_CONFIG)

    def test_clean_amount_with_dollar_sign(self, extractor):
        """Should remove dollar signs."""
        assert extractor._clean_amount("$100.00") == 100.00
        assert extractor._clean_amount("$1,234.56") == 1234.56

    def test_clean_amount_with_commas(self, extractor):
        """Should remove commas."""
        assert extractor._clean_amount("1,000.00") == 1000.00
        assert extractor._clean_amount("1,234,567.89") == 1234567.89

    def test_clean_amount_parentheses_as_negative(self, extractor):
        """Parentheses should indicate negative amounts."""
        assert extractor._clean_amount("(100.00)") == -100.00
        assert extractor._clean_amount("($50.25)") == -50.25

    def test_clean_amount_trailing_minus(self, extractor):
        """Trailing minus should be converted to negative."""
        assert extractor._clean_amount("100.00-") == -100.00
        assert extractor._clean_amount("50.25-") == -50.25

    def test_clean_amount_leading_minus(self, extractor):
        """Leading minus should work normally."""
        assert extractor._clean_amount("-100.00") == -100.00

    def test_clean_amount_empty(self, extractor):
        """Empty/None values should return 0."""
        assert extractor._clean_amount("") == 0.0
        assert extractor._clean_amount(None) == 0.0

    def test_clean_amount_invalid(self, extractor):
        """Invalid strings should return 0."""
        assert extractor._clean_amount("abc") == 0.0
        assert extractor._clean_amount("N/A") == 0.0


class TestDebitCreditMode:
    """Test separate debit/credit column parsing."""

    @pytest.fixture
    def extractor(self):
        return TransactionExtractor(DEBIT_CREDIT_CONFIG)

    def test_parse_debit_amount(self, extractor):
        """Debits should be negative."""
        row = ["01/15/2024", "Payment", "100.00", ""]
        col_map = {"date": 0, "description": 1, "debit": 2, "credit": 3}

        amount = extractor._parse_amount(row, col_map)
        assert amount == -100.00

    def test_parse_credit_amount(self, extractor):
        """Credits should be positive."""
        row = ["01/15/2024", "Deposit", "", "500.00"]
        col_map = {"date": 0, "description": 1, "debit": 2, "credit": 3}

        amount = extractor._parse_amount(row, col_map)
        assert amount == 500.00


class TestTableProcessing:
    """Test table extraction logic."""

    @pytest.fixture
    def extractor(self):
        return TransactionExtractor(CHASE_CONFIG)

    def test_find_header_row(self, extractor):
        """Should find the header row based on keywords."""
        table = [
            ["Bank Statement"],
            ["Account: 1234"],
            ["Date", "Description", "Amount", "Balance"],
            ["01/15", "Payment", "-50.00", "1000.00"],
        ]

        header_idx = extractor._find_header_row(table)
        assert header_idx == 2

    def test_find_header_row_not_found(self, extractor):
        """Should return None if no header row found."""
        table = [
            ["Random text"],
            ["More random text"],
            ["No headers here"],
        ]

        header_idx = extractor._find_header_row(table)
        assert header_idx is None

    def test_map_columns(self, extractor):
        """Should map config column names to indices."""
        headers = ["date", "transaction description", "amount", "balance"]

        col_map = extractor._map_columns(headers)

        assert col_map["date"] == 0
        assert col_map["description"] == 1
        assert col_map["amount"] == 2

    def test_should_skip_row(self, extractor):
        """Should skip rows containing skip patterns."""
        skip_row = ["01/01", "Opening Balance", "0.00", "5000.00"]
        normal_row = ["01/15", "Purchase", "-50.00", "4950.00"]

        assert extractor._should_skip_row(skip_row) is True
        assert extractor._should_skip_row(normal_row) is False

    def test_should_skip_empty_row(self, extractor):
        """Should skip rows with fewer than 2 non-empty cells."""
        empty_row = ["", "", "", ""]
        sparse_row = ["01/15", "", "", ""]

        assert extractor._should_skip_row(empty_row) is True
        assert extractor._should_skip_row(sparse_row) is True


class TestTextFallback:
    """Test text extraction when tables aren't found."""

    @pytest.fixture
    def extractor(self):
        return TransactionExtractor(CHASE_CONFIG)

    def test_parse_text_line(self, extractor):
        """Should parse transaction from text line."""
        line = "01/15/2024 ACH DEBIT NETFLIX 15.99"
        date_match = extractor.date_pattern.match(line)

        tx = extractor._parse_text_line(line, date_match, page_num=1, line_num=1)

        assert tx["date"] == "01/15/2024"
        assert "NETFLIX" in tx["description"]
        assert tx["amount"] == 15.99

    def test_multiline_description(self, extractor):
        """Should handle multiline descriptions."""
        text = """01/15/2024 ACH DEBIT AMAZON
        Prime Membership
        Monthly subscription fee
02/01/2024 DEPOSIT"""

        transactions = extractor._process_text(text, page_num=1)

        assert len(transactions) == 2
        assert "Prime" in transactions[0]["description"] or "Monthly" in transactions[0]["description"]

    def test_skip_balance_lines(self, extractor):
        """Should skip lines that look like balances."""
        text = """01/15/2024 Purchase -50.00
$1,234.56
01/16/2024 Another Purchase -25.00"""

        transactions = extractor._process_text(text, page_num=1)

        # Should have 2 transactions, not 3
        assert len(transactions) == 2


class TestPDFExtraction:
    """Test PDF extraction (mocked)."""

    @pytest.fixture
    def extractor(self):
        return TransactionExtractor(CHASE_CONFIG)

    @patch("services.bank_statement.extractor.pdfplumber")
    def test_extract_from_pdf_with_tables(self, mock_pdfplumber, extractor):
        """Should extract transactions from PDF tables."""
        # Mock pdfplumber
        mock_page = Mock()
        mock_page.extract_tables.return_value = [
            [
                ["Date", "Description", "Amount", "Balance"],
                ["01/15/2024", "Purchase", "-50.00", "1000.00"],
                ["01/16/2024", "Deposit", "100.00", "1100.00"],
            ]
        ]
        mock_page.extract_text.return_value = ""

        mock_pdf = Mock()
        mock_pdf.pages = [mock_page]
        mock_pdf.__enter__ = Mock(return_value=mock_pdf)
        mock_pdf.__exit__ = Mock(return_value=False)

        mock_pdfplumber.open.return_value = mock_pdf

        transactions, metadata = extractor.extract_from_pdf(BytesIO(b"fake pdf"))

        assert len(transactions) == 2
        assert metadata["pages_processed"] == 1

    @patch("services.bank_statement.extractor.pdfplumber")
    def test_extract_fallback_to_text(self, mock_pdfplumber, extractor):
        """Should fall back to text when no tables found."""
        mock_page = Mock()
        mock_page.extract_tables.return_value = []  # No tables
        mock_page.extract_text.return_value = "01/15/2024 Test Transaction -50.00"

        mock_pdf = Mock()
        mock_pdf.pages = [mock_page]
        mock_pdf.__enter__ = Mock(return_value=mock_pdf)
        mock_pdf.__exit__ = Mock(return_value=False)

        mock_pdfplumber.open.return_value = mock_pdf

        transactions, metadata = extractor.extract_from_pdf(BytesIO(b"fake pdf"))

        assert len(transactions) >= 1
        assert metadata["text_fallback_pages"] == 1

    def test_pdfplumber_not_installed(self):
        """Should raise ImportError if pdfplumber not available."""
        extractor = TransactionExtractor(CHASE_CONFIG)

        # Temporarily set pdfplumber to None
        import services.bank_statement.extractor as extractor_module
        original_pdfplumber = extractor_module.pdfplumber
        extractor_module.pdfplumber = None

        try:
            with pytest.raises(ImportError):
                extractor.extract_from_pdf(BytesIO(b"fake pdf"))
        finally:
            extractor_module.pdfplumber = original_pdfplumber


class TestEdgeCases:
    """Test edge cases and error handling."""

    @pytest.fixture
    def extractor(self):
        return TransactionExtractor(CHASE_CONFIG)

    def test_empty_table(self, extractor):
        """Should handle empty tables."""
        transactions = extractor._process_table([], page_num=1)
        assert transactions == []

    def test_table_with_only_header(self, extractor):
        """Should handle table with only header row."""
        table = [["Date", "Description", "Amount", "Balance"]]
        transactions = extractor._process_table(table, page_num=1)
        assert transactions == []

    def test_row_with_missing_date(self, extractor):
        """Should skip rows without valid date."""
        row = ["", "Some description", "-50.00", "1000.00"]
        col_map = {"date": 0, "description": 1, "amount": 2}

        tx = extractor._extract_transaction_from_row(row, col_map, page_num=1, row_num=1)
        assert tx is None
