"""
Transaction Extractor - Extract transactions from PDF bank statements.

Uses pdfplumber for digital PDFs (fast, free).
Falls back to AWS Textract for scanned/image PDFs (async, paid).
"""

import logging
import re
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Try to import pdfplumber - required dependency
try:
    import pdfplumber
except ImportError:
    pdfplumber = None
    logger.warning("pdfplumber not installed - PDF extraction will fail")


class TransactionExtractor:
    """Extract transactions from PDF bank statements."""

    def __init__(self, config: Dict):
        """
        Initialize extractor with bank config.

        Args:
            config: Bank-specific config from fingerprinter
        """
        self.config = config
        self.date_pattern = self._build_date_pattern()

    def _build_date_pattern(self) -> re.Pattern:
        """Build regex for date detection based on config."""
        date_format = self.config.get("columns", {}).get("date", {}).get("format", "MM/DD/YYYY")

        patterns = {
            "MM/DD/YYYY": r"\d{1,2}/\d{1,2}/\d{4}",
            "MM/DD": r"\d{1,2}/\d{1,2}",
            "DD/MM/YYYY": r"\d{1,2}/\d{1,2}/\d{4}",
            "YYYY-MM-DD": r"\d{4}-\d{1,2}-\d{1,2}",
            "M/D/YYYY": r"\d{1,2}/\d{1,2}/\d{4}",
            "Mon DD": r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}",
        }

        pattern_str = patterns.get(date_format, r"\d{1,2}/\d{1,2}(?:/\d{2,4})?")
        return re.compile(f"^{pattern_str}")

    def extract_from_pdf(
        self, pdf_source: Any, max_pages: Optional[int] = None
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Extract transactions from PDF.

        Args:
            pdf_source: File path string or BytesIO object
            max_pages: Maximum pages to process (None = all)

        Returns:
            Tuple of (transactions list, metadata dict)
        """
        if pdfplumber is None:
            raise ImportError("pdfplumber is required for PDF extraction")

        transactions: List[Dict[str, Any]] = []
        metadata = {
            "total_pages": 0,
            "pages_processed": 0,
            "extraction_method": "pdfplumber",
            "tables_found": 0,
            "text_fallback_pages": 0,
        }

        try:
            with pdfplumber.open(pdf_source) as pdf:
                metadata["total_pages"] = len(pdf.pages)
                pages_to_process = pdf.pages[:max_pages] if max_pages else pdf.pages

                for i, page in enumerate(pages_to_process):
                    page_transactions, used_text_fallback = self._process_page(page, i + 1)
                    transactions.extend(page_transactions)
                    metadata["pages_processed"] += 1

                    if used_text_fallback:
                        metadata["text_fallback_pages"] += 1

        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            raise

        logger.info(
            f"Extracted {len(transactions)} transactions from "
            f"{metadata['pages_processed']} pages"
        )

        return transactions, metadata

    def _process_page(
        self, page: Any, page_num: int
    ) -> Tuple[List[Dict[str, Any]], bool]:
        """
        Process a single PDF page.

        Returns:
            Tuple of (transactions, used_text_fallback)
        """
        transactions = []
        used_text_fallback = False

        # Try table extraction first
        tables = page.extract_tables()
        logger.info(f"Page {page_num}: Found {len(tables) if tables else 0} tables")

        if tables:
            for table_idx, table in enumerate(tables):
                logger.info(f"Page {page_num}, Table {table_idx}: {len(table)} rows")
                if table and len(table) > 0:
                    # Log first few rows for debugging
                    for row_idx, row in enumerate(table[:5]):
                        logger.debug(f"  Row {row_idx}: {row}")
                table_transactions = self._process_table(table, page_num)
                logger.info(f"  Extracted {len(table_transactions)} transactions from table {table_idx}")
                transactions.extend(table_transactions)

        # If no transactions from tables, try text extraction
        if not transactions:
            # Fall back to text extraction
            text = page.extract_text()
            if text:
                logger.info(f"Page {page_num}: Using text fallback, text length: {len(text)}")
                # Log first 500 chars for debugging
                logger.debug(f"  Text preview: {text[:500]}")
                text_transactions = self._process_text(text, page_num)
                logger.info(f"  Extracted {len(text_transactions)} transactions from text")
                transactions.extend(text_transactions)
                used_text_fallback = True

        return transactions, used_text_fallback

    def _process_table(
        self, table: List[List[Any]], page_num: int
    ) -> List[Dict[str, Any]]:
        """Process extracted table into transactions."""
        transactions = []

        if not table or len(table) < 2:
            return transactions

        # Find header row
        header_row_idx = self._find_header_row(table)
        if header_row_idx is None:
            logger.debug(f"No header row found in table on page {page_num}")
            return transactions

        # Map columns
        headers = [str(h).strip().lower() if h else "" for h in table[header_row_idx]]
        col_map = self._map_columns(headers)

        if "date" not in col_map:
            logger.debug(f"No date column found on page {page_num}")
            return transactions

        # Process data rows
        for row_idx, row in enumerate(table[header_row_idx + 1 :], start=header_row_idx + 2):
            if self._should_skip_row(row):
                continue

            tx = self._extract_transaction_from_row(row, col_map, page_num, row_idx)
            if tx:
                transactions.append(tx)

        return transactions

    def _find_header_row(self, table: List[List[Any]]) -> Optional[int]:
        """Find the row containing column headers."""
        keywords = self.config.get("table_detection", {}).get(
            "header_row_keywords", ["Date", "Description", "Amount"]
        )
        keywords_lower = [kw.lower() for kw in keywords]
        logger.debug(f"Looking for header keywords: {keywords_lower}")

        for i, row in enumerate(table[:10]):  # Check first 10 rows only
            row_text = " ".join(str(cell).lower() for cell in row if cell)
            matches = sum(1 for kw in keywords_lower if kw in row_text)
            logger.debug(f"  Row {i}: '{row_text[:100]}' - {matches} keyword matches")
            # Require at least 2 keyword matches
            if matches >= 2:
                logger.info(f"Found header row at index {i}: {row}")
                return i

        logger.warning(f"No header row found in table (checked {min(len(table), 10)} rows)")
        return None

    def _map_columns(self, headers: List[str]) -> Dict[str, int]:
        """Map config column names to actual column indices."""
        col_map = {}
        columns_config = self.config.get("columns", {})
        logger.debug(f"Mapping columns from headers: {headers}")

        for field, field_config in columns_config.items():
            names = field_config.get("names", [field])
            for name in names:
                name_lower = name.lower()
                for i, header in enumerate(headers):
                    if name_lower in header or header in name_lower:
                        col_map[field] = i
                        logger.debug(f"  Mapped '{field}' to column {i} (header: '{header}')")
                        break
                if field in col_map:
                    break

        logger.info(f"Column mapping result: {col_map}")
        return col_map

    def _should_skip_row(self, row: List[Any]) -> bool:
        """Check if row should be skipped (e.g., totals, subtotals)."""
        row_text = " ".join(str(cell) for cell in row if cell).lower()
        skip_patterns = self.config.get("table_detection", {}).get(
            "skip_rows_containing", []
        )

        for pattern in skip_patterns:
            if pattern.lower() in row_text:
                return True

        # Skip empty rows
        non_empty = [cell for cell in row if cell and str(cell).strip()]
        if len(non_empty) < 2:
            return True

        return False

    def _extract_transaction_from_row(
        self, row: List[Any], col_map: Dict[str, int], page_num: int, row_num: int
    ) -> Optional[Dict[str, Any]]:
        """Extract a single transaction from a table row."""
        try:
            date_col = col_map.get("date")
            desc_col = col_map.get("description")

            if date_col is None:
                return None

            # Get and validate date
            date_raw = str(row[date_col]).strip() if row[date_col] else ""
            if not self.date_pattern.match(date_raw):
                return None

            # Get description
            description = ""
            if desc_col is not None and desc_col < len(row) and row[desc_col]:
                description = str(row[desc_col]).strip()

            # Get amount
            amount = self._parse_amount(row, col_map)

            return {
                "date": date_raw,
                "description": description,
                "amount": amount,
                "source": {"page": page_num, "row": row_num, "method": "table"},
                "raw_row": [str(c) if c else "" for c in row],
            }

        except (IndexError, TypeError, ValueError) as e:
            logger.debug(f"Failed to extract row: {e}")
            return None

    def _parse_amount(self, row: List[Any], col_map: Dict[str, int]) -> float:
        """Parse amount, handling debit/credit columns."""
        columns_config = self.config.get("columns", {})
        amount_config = columns_config.get("amount", {})

        if amount_config.get("debit_credit_mode"):
            # Separate debit/credit columns
            debit_col = col_map.get("debit", col_map.get("amount"))
            credit_col = col_map.get("credit")

            debit = 0.0
            credit = 0.0

            if debit_col is not None and debit_col < len(row):
                debit = self._clean_amount(row[debit_col])
            if credit_col is not None and credit_col < len(row):
                credit = self._clean_amount(row[credit_col])

            # Debits are negative (expenses), credits are positive (income)
            if credit > 0:
                return credit
            return -abs(debit) if debit else 0.0

        else:
            # Single amount column
            amount_col = col_map.get("amount")
            if amount_col is not None and amount_col < len(row):
                return self._clean_amount(row[amount_col])
            return 0.0

    def _clean_amount(self, value: Any) -> float:
        """Clean and parse amount string."""
        if not value:
            return 0.0

        text = str(value).strip()

        # Normalize Unicode minus signs (U+2212, U+2013 en-dash, U+2014 em-dash) to ASCII hyphen
        text = text.replace("\u2212", "-").replace("\u2013", "-").replace("\u2014", "-")

        # Remove currency symbols, commas, spaces
        text = re.sub(r"[$,\s]", "", text)

        # Handle parentheses as negative
        if text.startswith("(") and text.endswith(")"):
            text = "-" + text[1:-1]

        # Handle trailing minus
        if text.endswith("-"):
            text = "-" + text[:-1]

        try:
            return float(text)
        except ValueError:
            return 0.0

    def _process_text(self, text: str, page_num: int) -> List[Dict[str, Any]]:
        """
        Process raw text when tables aren't detected.
        Handles multiline descriptions.
        """
        lines = text.split("\n")
        transactions = []
        current_tx: Optional[Dict[str, Any]] = None
        multiline = self.config.get("columns", {}).get("description", {}).get(
            "multiline", True
        )
        logger.debug(f"Processing {len(lines)} lines of text, date pattern: {self.date_pattern.pattern}")

        for line_num, line in enumerate(lines, start=1):
            line = line.strip()
            if not line:
                continue

            # Check if line starts with a date
            date_match = self.date_pattern.match(line)
            if line_num <= 20:
                logger.debug(f"  Line {line_num}: date_match={bool(date_match)}, text='{line[:80]}'")

            if date_match:
                # Save previous transaction
                if current_tx:
                    transactions.append(current_tx)

                # Parse the new line
                current_tx = self._parse_text_line(line, date_match, page_num, line_num)

            elif current_tx and multiline:
                # Append to previous transaction's description
                # But skip if line looks like a balance or total
                if not self._should_skip_text_line(line):
                    current_tx["description"] += " " + line

        # Don't forget last transaction
        if current_tx:
            transactions.append(current_tx)

        return transactions

    def _parse_text_line(
        self, line: str, date_match: re.Match, page_num: int, line_num: int
    ) -> Dict[str, Any]:
        """Parse a single text line into a transaction."""
        date_str = date_match.group()
        remainder = line[date_match.end() :].strip()

        # Try to extract amount from end of line
        # Handle "AMOUNT BALANCE" pattern (two numbers at end, take the first)
        # Example: "Card Purchase ... -52.79 554.99"
        amount = 0.0

        # Look for two numbers at the end (amount + balance pattern)
        # Pattern: amount (possibly negative) followed by balance (positive)
        two_amounts_match = re.search(
            r"(-?[\d,]+\.?\d*)\s+(-?[\d,]+\.?\d*)$", remainder
        )
        if two_amounts_match:
            # First number is amount, second is balance
            amount = self._clean_amount(two_amounts_match.group(1))
            description = remainder[: two_amounts_match.start()].strip()
            logger.debug(f"Parsed two amounts: amount={amount}, balance={two_amounts_match.group(2)}, desc='{description[:50]}'")
        else:
            # Fall back to single amount at end
            amount_match = re.search(r"(-?[\d,$]+\.?\d*)$", remainder)
            if amount_match:
                amount = self._clean_amount(amount_match.group())
                description = remainder[: amount_match.start()].strip()
            else:
                description = remainder

        return {
            "date": date_str,
            "description": description,
            "amount": amount,
            "source": {"page": page_num, "line": line_num, "method": "text"},
        }

    def _should_skip_text_line(self, line: str) -> bool:
        """Check if a text line should be skipped for multiline append."""
        skip_patterns = self.config.get("table_detection", {}).get(
            "skip_rows_containing", []
        )

        line_lower = line.lower()
        for pattern in skip_patterns:
            if pattern.lower() in line_lower:
                return True

        # Skip lines that look like just amounts/balances
        if re.match(r"^[\s$,\d.-]+$", line):
            return True

        return False

    def get_page_count(self, pdf_source: Any) -> int:
        """Get total page count without full extraction."""
        if pdfplumber is None:
            raise ImportError("pdfplumber is required")

        with pdfplumber.open(pdf_source) as pdf:
            return len(pdf.pages)

    def extract_first_page_text(self, pdf_source: Any) -> str:
        """Extract text from first page only (for fingerprinting)."""
        if pdfplumber is None:
            raise ImportError("pdfplumber is required")

        with pdfplumber.open(pdf_source) as pdf:
            if pdf.pages:
                return pdf.pages[0].extract_text() or ""
        return ""
