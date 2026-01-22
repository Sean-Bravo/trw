"""
Tests for Accounting Exporter
"""

import pytest
import csv
from io import StringIO

from services.bank_statement.exporter import AccountingExporter


class TestQBOExport:
    """Test QuickBooks Online CSV format export."""

    @pytest.fixture
    def exporter(self):
        return AccountingExporter()

    def test_qbo_header(self, exporter):
        """Should have correct QBO header."""
        result = exporter.to_qbo([])

        reader = csv.reader(StringIO(result))
        header = next(reader)

        assert header == ["Date", "Description", "Amount"]

    def test_qbo_date_format(self, exporter):
        """QBO should use MM/DD/YYYY date format."""
        transactions = [
            {"date": "2024-01-15", "description": "Test", "amount": -50.00}
        ]

        result = exporter.to_qbo(transactions)
        reader = csv.reader(StringIO(result))
        next(reader)  # Skip header
        row = next(reader)

        assert row[0] == "1/15/2024"

    def test_qbo_amount_format(self, exporter):
        """QBO amounts should have 2 decimal places."""
        transactions = [
            {"date": "2024-01-15", "description": "Test", "amount": -50}
        ]

        result = exporter.to_qbo(transactions)
        reader = csv.reader(StringIO(result))
        next(reader)
        row = next(reader)

        assert row[2] == "-50.00"

    def test_qbo_preserves_negative_amounts(self, exporter):
        """Negative amounts (expenses) should be preserved."""
        transactions = [
            {"date": "2024-01-15", "description": "Expense", "amount": -100.50}
        ]

        result = exporter.to_qbo(transactions)
        reader = csv.reader(StringIO(result))
        next(reader)
        row = next(reader)

        assert float(row[2]) == -100.50

    def test_qbo_multiple_transactions(self, exporter):
        """Should export multiple transactions."""
        transactions = [
            {"date": "2024-01-15", "description": "Expense 1", "amount": -50.00},
            {"date": "2024-01-16", "description": "Income 1", "amount": 100.00},
            {"date": "2024-01-17", "description": "Expense 2", "amount": -25.00},
        ]

        result = exporter.to_qbo(transactions)
        reader = csv.reader(StringIO(result))
        rows = list(reader)

        # Header + 3 data rows
        assert len(rows) == 4


class TestXeroExport:
    """Test Xero CSV format export."""

    @pytest.fixture
    def exporter(self):
        return AccountingExporter()

    def test_xero_header(self, exporter):
        """Should have correct Xero header."""
        result = exporter.to_xero([])

        reader = csv.reader(StringIO(result))
        header = next(reader)

        assert "*Date" in header
        assert "*Amount" in header
        assert "Payee" in header
        assert "Description" in header

    def test_xero_date_format(self, exporter):
        """Xero should accept YYYY-MM-DD format."""
        transactions = [
            {"date": "2024-01-15", "description": "Test", "amount": -50.00}
        ]

        result = exporter.to_xero(transactions)
        reader = csv.reader(StringIO(result))
        next(reader)  # Skip header
        row = next(reader)

        # Should be YYYY-MM-DD (Xero accepts this)
        assert row[0] == "2024-01-15"

    def test_xero_extracts_payee(self, exporter):
        """Should extract payee from description."""
        transactions = [
            {"date": "2024-01-15", "description": "ACH DEBIT NETFLIX", "amount": -15.99}
        ]

        result = exporter.to_xero(transactions)
        reader = csv.reader(StringIO(result))
        next(reader)
        row = next(reader)

        # Payee column (index 2)
        assert "NETFLIX" in row[2]


class TestExcelExport:
    """Test generic Excel/CSV format export."""

    @pytest.fixture
    def exporter(self):
        return AccountingExporter()

    def test_excel_header(self, exporter):
        """Should have comprehensive Excel header."""
        result = exporter.to_excel_generic([])

        reader = csv.reader(StringIO(result))
        header = next(reader)

        assert "Date" in header
        assert "Description" in header
        assert "Amount" in header
        assert "Debit" in header
        assert "Credit" in header

    def test_excel_splits_debit_credit(self, exporter):
        """Should split amount into Debit/Credit columns."""
        transactions = [
            {"date": "2024-01-15", "description": "Expense", "amount": -50.00},
            {"date": "2024-01-16", "description": "Income", "amount": 100.00},
        ]

        result = exporter.to_excel_generic(transactions)
        reader = csv.reader(StringIO(result))
        header = next(reader)

        debit_idx = header.index("Debit")
        credit_idx = header.index("Credit")

        # Expense row
        expense_row = next(reader)
        assert expense_row[debit_idx] == "50.00"  # Debit (absolute value)
        assert expense_row[credit_idx] == ""  # No credit

        # Income row
        income_row = next(reader)
        assert income_row[debit_idx] == ""  # No debit
        assert income_row[credit_idx] == "100.00"  # Credit


class TestDateFormatting:
    """Test date format conversions."""

    @pytest.fixture
    def exporter(self):
        return AccountingExporter()

    def test_format_date_qbo_from_yyyy_mm_dd(self, exporter):
        """Should convert YYYY-MM-DD to MM/DD/YYYY for QBO."""
        result = exporter._format_date_qbo("2024-01-15")
        assert result == "1/15/2024"

    def test_format_date_qbo_already_mm_dd_yyyy(self, exporter):
        """Should keep MM/DD/YYYY as-is for QBO."""
        result = exporter._format_date_qbo("1/15/2024")
        assert result == "1/15/2024"

    def test_format_date_qbo_empty(self, exporter):
        """Empty date should return empty string."""
        result = exporter._format_date_qbo("")
        assert result == ""

    def test_format_date_xero_from_mm_dd_yyyy(self, exporter):
        """Should convert MM/DD/YYYY to YYYY-MM-DD for Xero."""
        result = exporter._format_date_xero("1/15/2024")
        assert result == "2024-01-15"


class TestPayeeExtraction:
    """Test payee extraction from descriptions."""

    @pytest.fixture
    def exporter(self):
        return AccountingExporter()

    def test_extract_payee_ach_debit(self, exporter):
        """Should extract payee after ACH DEBIT."""
        result = exporter._extract_payee("ACH DEBIT NETFLIX SUBSCRIPTION")
        assert "NETFLIX" in result

    def test_extract_payee_payment_to(self, exporter):
        """Should extract payee after 'TO'."""
        result = exporter._extract_payee("VENMO PAYMENT TO JOHN DOE")
        assert "JOHN" in result or "DOE" in result

    def test_extract_payee_transfer_from(self, exporter):
        """Should extract payee after 'FROM'."""
        result = exporter._extract_payee("WIRE TRANSFER FROM ABC COMPANY")
        assert "ABC" in result

    def test_extract_payee_default(self, exporter):
        """Should use first words as default payee."""
        result = exporter._extract_payee("AMAZON MARKETPLACE ORDER")
        assert "AMAZON" in result

    def test_extract_payee_empty(self, exporter):
        """Empty description should return empty payee."""
        result = exporter._extract_payee("")
        assert result == ""


class TestExportDispatcher:
    """Test the export() method that dispatches to format-specific methods."""

    @pytest.fixture
    def exporter(self):
        return AccountingExporter()

    @pytest.fixture
    def sample_transactions(self):
        return [
            {"date": "2024-01-15", "description": "Test", "amount": -50.00}
        ]

    def test_export_qbo(self, exporter, sample_transactions):
        """Should route to QBO format."""
        result = exporter.export(sample_transactions, "qbo")
        assert "Date,Description,Amount" in result

    def test_export_quickbooks(self, exporter, sample_transactions):
        """'quickbooks' should be alias for qbo."""
        result = exporter.export(sample_transactions, "quickbooks")
        assert "Date,Description,Amount" in result

    def test_export_xero(self, exporter, sample_transactions):
        """Should route to Xero format."""
        result = exporter.export(sample_transactions, "xero")
        assert "*Date" in result

    def test_export_excel(self, exporter, sample_transactions):
        """Should route to Excel format."""
        result = exporter.export(sample_transactions, "excel")
        assert "Debit" in result

    def test_export_generic(self, exporter, sample_transactions):
        """'generic' should be alias for excel."""
        result = exporter.export(sample_transactions, "generic")
        assert "Debit" in result

    def test_export_csv(self, exporter, sample_transactions):
        """'csv' should be alias for excel."""
        result = exporter.export(sample_transactions, "csv")
        assert "Debit" in result

    def test_export_unknown_format(self, exporter, sample_transactions):
        """Unknown format should fall back to generic."""
        result = exporter.export(sample_transactions, "unknown_format")
        assert "Debit" in result


class TestSupportedFormats:
    """Test get_supported_formats()."""

    @pytest.fixture
    def exporter(self):
        return AccountingExporter()

    def test_returns_list(self, exporter):
        """Should return list of formats."""
        formats = exporter.get_supported_formats()
        assert isinstance(formats, list)

    def test_format_structure(self, exporter):
        """Each format should have id, name, description."""
        formats = exporter.get_supported_formats()

        for fmt in formats:
            assert "id" in fmt
            assert "name" in fmt
            assert "description" in fmt

    def test_includes_major_formats(self, exporter):
        """Should include QBO, Xero, and Excel formats."""
        formats = exporter.get_supported_formats()
        ids = [f["id"] for f in formats]

        assert "qbo" in ids
        assert "xero" in ids
        assert "excel" in ids


class TestCSVEscaping:
    """Test proper CSV escaping of special characters."""

    @pytest.fixture
    def exporter(self):
        return AccountingExporter()

    def test_escape_comma_in_description(self, exporter):
        """Commas in description should be properly escaped."""
        transactions = [
            {"date": "2024-01-15", "description": "Amazon, Inc. Purchase", "amount": -50.00}
        ]

        result = exporter.to_qbo(transactions)

        # Should be parseable
        reader = csv.reader(StringIO(result))
        next(reader)  # Skip header
        row = next(reader)

        assert "Amazon, Inc. Purchase" in row[1]

    def test_escape_quotes_in_description(self, exporter):
        """Quotes in description should be properly escaped."""
        transactions = [
            {"date": "2024-01-15", "description": 'Payment for "Services"', "amount": -50.00}
        ]

        result = exporter.to_qbo(transactions)

        # Should be parseable
        reader = csv.reader(StringIO(result))
        next(reader)
        row = next(reader)

        assert 'Services' in row[1]

    def test_escape_newline_in_description(self, exporter):
        """Newlines in description should be handled."""
        transactions = [
            {"date": "2024-01-15", "description": "Line1\nLine2", "amount": -50.00}
        ]

        result = exporter.to_qbo(transactions)

        # Should produce valid CSV (even if newlines are preserved)
        reader = csv.reader(StringIO(result))
        rows = list(reader)
        # Should have at least header + 1 data row
        assert len(rows) >= 2
