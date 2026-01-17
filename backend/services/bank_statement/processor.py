"""
Bank Statement Processor - Main orchestrator for PDF to CSV conversion.

Pipeline:
1. Fingerprint bank from PDF
2. Extract transactions using bank config
3. Normalize dates/amounts
4. Detect and remove duplicates
5. Export to requested format (QBO/Xero)
"""

import logging
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple, Union

from .fingerprinter import BankFingerprinter
from .extractor import TransactionExtractor
from .normalizer import TransactionNormalizer
from .duplicate_detector import DuplicateDetector
from .exporter import AccountingExporter

logger = logging.getLogger(__name__)


class BankStatementProcessor:
    """Main processor for bank statement PDF conversion."""

    def __init__(self, config_dir: Optional[str] = None):
        """
        Initialize processor.

        Args:
            config_dir: Path to bank config directory
        """
        self.fingerprinter = BankFingerprinter(config_dir)
        self.exporter = AccountingExporter()

    def process(
        self,
        pdf_source: Union[str, BytesIO],
        output_format: str = "qbo",
        deduplicate: bool = True,
        statement_year: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Process a bank statement PDF.

        Args:
            pdf_source: File path or BytesIO of PDF
            output_format: Output format ('qbo', 'xero', 'excel')
            deduplicate: Whether to remove duplicate transactions
            statement_year: Year for date normalization (auto-detected if None)

        Returns:
            Dict with:
                - success: bool
                - csv_content: str (if success)
                - transactions: list of transaction dicts
                - metadata: processing metadata
                - warnings: list of warning messages
                - error: str (if not success)
        """
        result = {
            "success": False,
            "csv_content": "",
            "transactions": [],
            "metadata": {},
            "warnings": [],
        }

        try:
            # Step 1: Extract first page for fingerprinting
            logger.info("Step 1: Fingerprinting bank...")
            temp_extractor = TransactionExtractor({})  # Empty config for text extraction
            first_page_text = temp_extractor.extract_first_page_text(pdf_source)

            if not first_page_text:
                result["warnings"].append("Could not extract text from first page")

            # Step 2: Detect bank
            bank_config = self.fingerprinter.detect_bank(first_page_text)
            bank_name = bank_config.get("bank", {}).get("name", "Unknown")
            is_generic = bank_config.get("bank", {}).get("is_generic", False)

            result["metadata"]["detected_bank"] = bank_name
            result["metadata"]["config_version"] = self.fingerprinter.get_config_version(bank_name)

            if is_generic:
                result["warnings"].append(
                    f"Bank not recognized. Using generic parser - please review results."
                )

            logger.info(f"Detected bank: {bank_name}")

            # Step 3: Try to infer statement period
            normalizer = TransactionNormalizer(bank_config, statement_year)
            period = normalizer.infer_statement_period(first_page_text)
            if period:
                result["metadata"]["statement_period"] = {
                    "start": period["start"].isoformat(),
                    "end": period["end"].isoformat(),
                }
                # Use end date's year for normalization
                normalizer.set_statement_year(period["end"].year)

            # Step 4: Extract transactions
            logger.info("Step 2: Extracting transactions...")
            extractor = TransactionExtractor(bank_config)
            raw_transactions, extraction_meta = extractor.extract_from_pdf(pdf_source)

            result["metadata"].update(extraction_meta)

            if not raw_transactions:
                result["error"] = "No transactions found in PDF"
                result["warnings"].append(
                    "Could not extract any transactions. "
                    "The PDF may be scanned/image-based (not supported yet) "
                    "or in an unrecognized format."
                )
                return result

            logger.info(f"Extracted {len(raw_transactions)} raw transactions")

            # Step 5: Normalize transactions
            logger.info("Step 3: Normalizing transactions...")
            normalized = normalizer.normalize(raw_transactions)

            # Check for normalization errors
            errors = [tx for tx in normalized if tx.get("normalization_error")]
            if errors:
                result["warnings"].append(
                    f"{len(errors)} transactions had normalization issues"
                )

            # Step 6: Deduplicate
            if deduplicate:
                logger.info("Step 4: Checking for duplicates...")
                detector = DuplicateDetector()
                stats = detector.get_duplicate_stats(normalized)

                if stats["duplicate_count"] > 0:
                    normalized = detector.deduplicate(normalized, strategy="keep_first")
                    result["warnings"].append(
                        f"Removed {stats['duplicate_count']} duplicate transactions"
                    )
                    result["metadata"]["duplicates_removed"] = stats["duplicate_count"]

            result["metadata"]["transaction_count"] = len(normalized)

            # Step 7: Export to requested format
            logger.info(f"Step 5: Exporting to {output_format} format...")
            csv_content = self.exporter.export(normalized, output_format)

            # Prepare transaction summary for result
            result["transactions"] = [
                {
                    "date": tx.get("date", ""),
                    "description": tx.get("description", ""),
                    "amount": tx.get("amount", 0),
                }
                for tx in normalized
            ]

            result["success"] = True
            result["csv_content"] = csv_content
            result["metadata"]["output_format"] = output_format

            logger.info(
                f"Successfully processed {len(normalized)} transactions "
                f"from {bank_name} statement"
            )

        except ImportError as e:
            result["error"] = f"Missing dependency: {str(e)}"
            logger.error(f"Import error: {e}")

        except Exception as e:
            result["error"] = f"Processing failed: {str(e)}"
            logger.exception(f"Processing error: {e}")

        return result

    def get_supported_banks(self) -> List[Dict[str, Any]]:
        """Get list of supported banks."""
        return self.fingerprinter.get_supported_banks()

    def get_supported_formats(self) -> List[Dict[str, str]]:
        """Get list of supported export formats."""
        return self.exporter.get_supported_formats()

    def validate_pdf(self, pdf_source: Union[str, BytesIO]) -> Dict[str, Any]:
        """
        Validate a PDF without full processing.

        Returns:
            Dict with validation results
        """
        result = {
            "valid": False,
            "page_count": 0,
            "detected_bank": None,
            "is_generic": False,
            "warnings": [],
        }

        try:
            extractor = TransactionExtractor({})

            # Check page count
            page_count = extractor.get_page_count(pdf_source)
            result["page_count"] = page_count

            if page_count == 0:
                result["warnings"].append("PDF has no pages")
                return result

            if page_count > 50:
                result["warnings"].append(
                    f"PDF has {page_count} pages - processing may be slow"
                )

            # Try fingerprinting
            first_page_text = extractor.extract_first_page_text(pdf_source)

            if not first_page_text:
                result["warnings"].append(
                    "Could not extract text - PDF may be scanned/image-based"
                )
                return result

            # Detect bank
            bank_config = self.fingerprinter.detect_bank(first_page_text)
            result["detected_bank"] = bank_config.get("bank", {}).get("name")
            result["is_generic"] = bank_config.get("bank", {}).get("is_generic", False)

            if result["is_generic"]:
                result["warnings"].append(
                    "Bank not recognized - generic parser will be used"
                )

            result["valid"] = True

        except Exception as e:
            result["warnings"].append(f"Validation error: {str(e)}")

        return result


# Convenience function for simple usage
def process_bank_statement(
    pdf_source: Union[str, BytesIO],
    output_format: str = "qbo",
) -> Dict[str, Any]:
    """
    Process a bank statement PDF (convenience function).

    Args:
        pdf_source: File path or BytesIO of PDF
        output_format: Output format ('qbo', 'xero', 'excel')

    Returns:
        Processing result dict
    """
    processor = BankStatementProcessor()
    return processor.process(pdf_source, output_format)
