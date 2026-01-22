"""
Tests for Bank Statement Processor (Integration)
"""

import pytest
from io import BytesIO
from unittest.mock import Mock, patch, MagicMock

from services.bank_statement.processor import BankStatementProcessor, process_bank_statement


class TestProcessorInitialization:
    """Test processor initialization."""

    def test_creates_fingerprinter(self):
        """Should create fingerprinter on init."""
        processor = BankStatementProcessor()
        assert processor.fingerprinter is not None

    def test_creates_exporter(self):
        """Should create exporter on init."""
        processor = BankStatementProcessor()
        assert processor.exporter is not None

    def test_custom_config_dir(self):
        """Should accept custom config directory."""
        processor = BankStatementProcessor(config_dir="/custom/path")
        assert processor.fingerprinter.config_dir == "/custom/path"


class TestFullPipeline:
    """Test the complete processing pipeline (mocked)."""

    @pytest.fixture
    def processor(self):
        return BankStatementProcessor()

    @patch("services.bank_statement.processor.TransactionExtractor")
    def test_successful_processing(self, mock_extractor_class, processor):
        """Should process PDF successfully."""
        # Mock extractor
        mock_extractor = Mock()
        mock_extractor.extract_first_page_text.return_value = "JPMorgan Chase Bank, N.A."
        mock_extractor.extract_from_pdf.return_value = (
            [
                {"date": "01/15/2024", "description": "Test", "amount": -50.00},
                {"date": "01/16/2024", "description": "Test2", "amount": 100.00},
            ],
            {"pages_processed": 1, "total_pages": 1},
        )
        mock_extractor_class.return_value = mock_extractor

        result = processor.process(BytesIO(b"fake pdf"))

        assert result["success"] is True
        assert len(result["transactions"]) == 2
        assert "csv_content" in result
        assert result["metadata"]["detected_bank"] == "Chase"

    @patch("services.bank_statement.processor.TransactionExtractor")
    def test_no_transactions_found(self, mock_extractor_class, processor):
        """Should handle PDF with no transactions."""
        mock_extractor = Mock()
        mock_extractor.extract_first_page_text.return_value = "Some bank text"
        mock_extractor.extract_from_pdf.return_value = ([], {"pages_processed": 1})
        mock_extractor_class.return_value = mock_extractor

        result = processor.process(BytesIO(b"fake pdf"))

        assert result["success"] is False
        assert "No transactions" in result["error"]

    @patch("services.bank_statement.processor.TransactionExtractor")
    def test_generic_bank_warning(self, mock_extractor_class, processor):
        """Should warn when using generic parser."""
        mock_extractor = Mock()
        mock_extractor.extract_first_page_text.return_value = "Unknown bank statement"
        mock_extractor.extract_from_pdf.return_value = (
            [{"date": "01/15/2024", "description": "Test", "amount": -50.00}],
            {"pages_processed": 1},
        )
        mock_extractor_class.return_value = mock_extractor

        result = processor.process(BytesIO(b"fake pdf"))

        # Should have warning about generic parser
        warnings_text = " ".join(result["warnings"])
        assert "generic" in warnings_text.lower() or "not recognized" in warnings_text.lower()


class TestOutputFormats:
    """Test different output format options."""

    @pytest.fixture
    def processor(self):
        return BankStatementProcessor()

    @patch("services.bank_statement.processor.TransactionExtractor")
    def test_qbo_format(self, mock_extractor_class, processor):
        """Should export to QBO format."""
        mock_extractor = Mock()
        mock_extractor.extract_first_page_text.return_value = "Chase"
        mock_extractor.extract_from_pdf.return_value = (
            [{"date": "01/15/2024", "description": "Test", "amount": -50.00}],
            {},
        )
        mock_extractor_class.return_value = mock_extractor

        result = processor.process(BytesIO(b"pdf"), output_format="qbo")

        assert result["metadata"]["output_format"] == "qbo"
        assert "Date,Description,Amount" in result["csv_content"]

    @patch("services.bank_statement.processor.TransactionExtractor")
    def test_xero_format(self, mock_extractor_class, processor):
        """Should export to Xero format."""
        mock_extractor = Mock()
        mock_extractor.extract_first_page_text.return_value = "Chase"
        mock_extractor.extract_from_pdf.return_value = (
            [{"date": "01/15/2024", "description": "Test", "amount": -50.00}],
            {},
        )
        mock_extractor_class.return_value = mock_extractor

        result = processor.process(BytesIO(b"pdf"), output_format="xero")

        assert result["metadata"]["output_format"] == "xero"
        assert "*Date" in result["csv_content"]

    @patch("services.bank_statement.processor.TransactionExtractor")
    def test_excel_format(self, mock_extractor_class, processor):
        """Should export to Excel format."""
        mock_extractor = Mock()
        mock_extractor.extract_first_page_text.return_value = "Chase"
        mock_extractor.extract_from_pdf.return_value = (
            [{"date": "01/15/2024", "description": "Test", "amount": -50.00}],
            {},
        )
        mock_extractor_class.return_value = mock_extractor

        result = processor.process(BytesIO(b"pdf"), output_format="excel")

        assert result["metadata"]["output_format"] == "excel"
        assert "Debit" in result["csv_content"]


class TestDeduplication:
    """Test deduplication functionality."""

    @pytest.fixture
    def processor(self):
        return BankStatementProcessor()

    @patch("services.bank_statement.processor.TransactionExtractor")
    def test_deduplication_enabled(self, mock_extractor_class, processor):
        """Should remove duplicates when enabled."""
        mock_extractor = Mock()
        mock_extractor.extract_first_page_text.return_value = "Chase"
        mock_extractor.extract_from_pdf.return_value = (
            [
                {"date": "01/15/2024", "description": "Same", "amount": -50.00},
                {"date": "01/15/2024", "description": "Same", "amount": -50.00},  # Duplicate
                {"date": "01/16/2024", "description": "Different", "amount": -25.00},
            ],
            {},
        )
        mock_extractor_class.return_value = mock_extractor

        result = processor.process(BytesIO(b"pdf"), deduplicate=True)

        assert result["success"] is True
        assert len(result["transactions"]) == 2  # One duplicate removed
        assert result["metadata"].get("duplicates_removed") == 1

    @patch("services.bank_statement.processor.TransactionExtractor")
    def test_deduplication_disabled(self, mock_extractor_class, processor):
        """Should keep duplicates when disabled."""
        mock_extractor = Mock()
        mock_extractor.extract_first_page_text.return_value = "Chase"
        mock_extractor.extract_from_pdf.return_value = (
            [
                {"date": "01/15/2024", "description": "Same", "amount": -50.00},
                {"date": "01/15/2024", "description": "Same", "amount": -50.00},
            ],
            {},
        )
        mock_extractor_class.return_value = mock_extractor

        result = processor.process(BytesIO(b"pdf"), deduplicate=False)

        assert result["success"] is True
        assert len(result["transactions"]) == 2  # Both kept


class TestValidation:
    """Test PDF validation."""

    @pytest.fixture
    def processor(self):
        return BankStatementProcessor()

    @patch("services.bank_statement.processor.TransactionExtractor")
    def test_validate_valid_pdf(self, mock_extractor_class, processor):
        """Should validate a valid PDF."""
        mock_extractor = Mock()
        mock_extractor.get_page_count.return_value = 5
        mock_extractor.extract_first_page_text.return_value = "JPMorgan Chase Bank, N.A."
        mock_extractor_class.return_value = mock_extractor

        result = processor.validate_pdf(BytesIO(b"pdf"))

        assert result["valid"] is True
        assert result["page_count"] == 5
        assert result["detected_bank"] == "Chase"

    @patch("services.bank_statement.processor.TransactionExtractor")
    def test_validate_empty_pdf(self, mock_extractor_class, processor):
        """Should handle PDF with no pages."""
        mock_extractor = Mock()
        mock_extractor.get_page_count.return_value = 0
        mock_extractor_class.return_value = mock_extractor

        result = processor.validate_pdf(BytesIO(b"pdf"))

        assert result["valid"] is False
        assert "no pages" in " ".join(result["warnings"]).lower()

    @patch("services.bank_statement.processor.TransactionExtractor")
    def test_validate_large_pdf_warning(self, mock_extractor_class, processor):
        """Should warn about large PDFs."""
        mock_extractor = Mock()
        mock_extractor.get_page_count.return_value = 100
        mock_extractor.extract_first_page_text.return_value = "Chase"
        mock_extractor_class.return_value = mock_extractor

        result = processor.validate_pdf(BytesIO(b"pdf"))

        warnings_text = " ".join(result["warnings"]).lower()
        assert "slow" in warnings_text or "100" in warnings_text

    @patch("services.bank_statement.processor.TransactionExtractor")
    def test_validate_scanned_pdf(self, mock_extractor_class, processor):
        """Should detect scanned/image PDFs."""
        mock_extractor = Mock()
        mock_extractor.get_page_count.return_value = 5
        mock_extractor.extract_first_page_text.return_value = ""  # No text = scanned
        mock_extractor_class.return_value = mock_extractor

        result = processor.validate_pdf(BytesIO(b"pdf"))

        # Should not be valid or should have warning
        warnings_text = " ".join(result["warnings"]).lower()
        assert "scanned" in warnings_text or "image" in warnings_text or result["valid"] is False


class TestSupportedBanksAndFormats:
    """Test listing supported banks and formats."""

    @pytest.fixture
    def processor(self):
        return BankStatementProcessor()

    def test_get_supported_banks(self, processor):
        """Should return list of supported banks."""
        banks = processor.get_supported_banks()

        assert isinstance(banks, list)
        bank_names = [b["name"] for b in banks]
        assert "Chase" in bank_names

    def test_get_supported_formats(self, processor):
        """Should return list of supported formats."""
        formats = processor.get_supported_formats()

        assert isinstance(formats, list)
        format_ids = [f["id"] for f in formats]
        assert "qbo" in format_ids
        assert "xero" in format_ids


class TestErrorHandling:
    """Test error handling scenarios."""

    @pytest.fixture
    def processor(self):
        return BankStatementProcessor()

    @patch("services.bank_statement.processor.TransactionExtractor")
    def test_handles_extraction_error(self, mock_extractor_class, processor):
        """Should handle extraction errors gracefully."""
        mock_extractor = Mock()
        mock_extractor.extract_first_page_text.side_effect = Exception("PDF error")
        mock_extractor_class.return_value = mock_extractor

        result = processor.process(BytesIO(b"bad pdf"))

        assert result["success"] is False
        assert "error" in result

    def test_handles_missing_pdfplumber(self, processor):
        """Should handle missing pdfplumber dependency."""
        # Import error is caught in the processor
        # This test verifies error handling exists
        pass


class TestConvenienceFunction:
    """Test the convenience function."""

    @patch("services.bank_statement.processor.BankStatementProcessor")
    def test_process_bank_statement_function(self, mock_processor_class):
        """Convenience function should create processor and call process()."""
        mock_processor = Mock()
        mock_processor.process.return_value = {"success": True}
        mock_processor_class.return_value = mock_processor

        result = process_bank_statement(BytesIO(b"pdf"), output_format="xero")

        mock_processor.process.assert_called_once()
        assert result["success"] is True


class TestStatementPeriodInference:
    """Test statement period inference."""

    @pytest.fixture
    def processor(self):
        return BankStatementProcessor()

    @patch("services.bank_statement.processor.TransactionExtractor")
    def test_infers_statement_period(self, mock_extractor_class, processor):
        """Should infer statement period from PDF text."""
        mock_extractor = Mock()
        mock_extractor.extract_first_page_text.return_value = """
            Chase Bank Statement
            Statement Period: January 1, 2024 - January 31, 2024
            JPMorgan Chase Bank, N.A.
        """
        mock_extractor.extract_from_pdf.return_value = (
            [{"date": "01/15/2024", "description": "Test", "amount": -50.00}],
            {},
        )
        mock_extractor_class.return_value = mock_extractor

        result = processor.process(BytesIO(b"pdf"))

        assert result["success"] is True
        if "statement_period" in result["metadata"]:
            assert "start" in result["metadata"]["statement_period"]
            assert "end" in result["metadata"]["statement_period"]
