"""
Transaction Normalizer - Normalize dates and amounts for consistent output.
"""

import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class TransactionNormalizer:
    """Normalize transaction dates and amounts."""

    def __init__(self, config: Dict, statement_year: Optional[int] = None):
        """
        Initialize normalizer with bank config.

        Args:
            config: Bank-specific config
            statement_year: Year to use when dates don't include year
        """
        self.config = config
        self.statement_year = statement_year or datetime.now().year
        self.date_output = config.get("normalization", {}).get("date_output", "YYYY-MM-DD")
        self.amount_sign = config.get("normalization", {}).get(
            "amount_sign", "negative_for_debits"
        )
        self.infer_year = config.get("normalization", {}).get(
            "infer_year_from_statement", False
        )

    def normalize(self, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Normalize all transactions.

        Args:
            transactions: Raw extracted transactions

        Returns:
            Normalized transactions with consistent date/amount format
        """
        normalized = []

        for tx in transactions:
            try:
                norm_tx = {
                    "date": self._normalize_date(tx.get("date", "")),
                    "description": self._clean_description(tx.get("description", "")),
                    "amount": self._normalize_amount(tx.get("amount", 0)),
                    "original": tx,  # Keep original for debugging
                }

                # Copy source metadata if present
                if "source" in tx:
                    norm_tx["source"] = tx["source"]

                normalized.append(norm_tx)

            except Exception as e:
                logger.warning(f"Failed to normalize transaction: {e}")
                # Still include it with partial normalization
                normalized.append(
                    {
                        "date": tx.get("date", ""),
                        "description": tx.get("description", ""),
                        "amount": float(tx.get("amount", 0) or 0),
                        "original": tx,
                        "normalization_error": str(e),
                    }
                )

        return normalized

    def _normalize_date(self, date_str: str) -> str:
        """
        Parse and reformat date to standard output format.

        Handles various input formats and missing years.
        """
        if not date_str:
            return ""

        date_str = date_str.strip()

        # Try various date formats
        parsed_date = None
        formats_to_try = [
            "%m/%d/%Y",
            "%m/%d/%y",
            "%m/%d",  # No year
            "%d/%m/%Y",
            "%d/%m/%y",
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%m-%d-%Y",
            "%m-%d-%y",
        ]

        for fmt in formats_to_try:
            try:
                parsed_date = datetime.strptime(date_str, fmt)

                # Handle missing year
                if "%Y" not in fmt and "%y" not in fmt:
                    parsed_date = parsed_date.replace(year=self.statement_year)

                    # Handle year rollover (e.g., statement from Dec-Jan)
                    # If month is in future, assume previous year
                    if parsed_date > datetime.now():
                        parsed_date = parsed_date.replace(year=self.statement_year - 1)

                break
            except ValueError:
                continue

        if parsed_date is None:
            # Try fuzzy parsing as last resort
            try:
                # Handle formats like "Jan 15" or "January 15, 2024"
                month_patterns = [
                    (r"(\w{3})\s+(\d{1,2})", "%b %d"),
                    (r"(\w+)\s+(\d{1,2}),?\s*(\d{4})?", None),
                ]

                for pattern, fmt in month_patterns:
                    match = re.match(pattern, date_str, re.IGNORECASE)
                    if match:
                        if fmt:
                            parsed_date = datetime.strptime(
                                f"{match.group(1)} {match.group(2)}", fmt
                            )
                            parsed_date = parsed_date.replace(year=self.statement_year)
                        break
            except Exception:
                pass

        if parsed_date is None:
            logger.debug(f"Could not parse date: {date_str}")
            return date_str  # Return original if parsing fails

        # Format output
        format_map = {
            "YYYY-MM-DD": "%Y-%m-%d",
            "MM/DD/YYYY": "%m/%d/%Y",
            "DD/MM/YYYY": "%d/%m/%Y",
        }

        output_fmt = format_map.get(self.date_output, "%Y-%m-%d")
        return parsed_date.strftime(output_fmt)

    def _clean_description(self, desc: str) -> str:
        """Clean up description text."""
        if not desc:
            return ""

        # Remove excessive whitespace
        desc = " ".join(desc.split())

        # Remove common noise patterns
        noise_patterns = [
            r"\s+REF\s*#?\s*\d+",  # Reference numbers
            r"\s+TRACE\s*#?\s*\d+",  # Trace numbers
            r"\s+CONF\s*#?\s*\d+",  # Confirmation numbers
        ]

        for pattern in noise_patterns:
            desc = re.sub(pattern, "", desc, flags=re.IGNORECASE)

        # Clean up again after removals
        desc = " ".join(desc.split())

        # Truncate if too long
        max_len = self.config.get("columns", {}).get("description", {}).get(
            "max_length", 255
        )
        if len(desc) > max_len:
            desc = desc[: max_len - 3] + "..."

        return desc

    def _normalize_amount(self, amount: Any) -> float:
        """Ensure consistent sign convention."""
        try:
            amount_float = float(amount) if amount else 0.0
        except (ValueError, TypeError):
            return 0.0

        # QBO expects negative for expenses, positive for income
        # Our extraction already follows this convention
        return round(amount_float, 2)

    def set_statement_year(self, year: int) -> None:
        """Update statement year for date normalization."""
        self.statement_year = year

    def infer_statement_period(self, text: str) -> Optional[Dict[str, datetime]]:
        """
        Try to extract statement period from PDF text.

        Returns:
            Dict with 'start' and 'end' dates if found
        """
        # Common patterns for statement periods
        patterns = [
            r"Statement\s+Period[:\s]+(\w+\s+\d{1,2},?\s+\d{4})\s*[-–to]+\s*(\w+\s+\d{1,2},?\s+\d{4})",
            r"(\d{1,2}/\d{1,2}/\d{2,4})\s*[-–to]+\s*(\d{1,2}/\d{1,2}/\d{2,4})",
            r"For\s+the\s+period\s+(\w+\s+\d{1,2})\s*[-–to]+\s*(\w+\s+\d{1,2}),?\s*(\d{4})",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    groups = match.groups()
                    # Parse based on number of groups
                    if len(groups) == 2:
                        start = self._parse_flexible_date(groups[0])
                        end = self._parse_flexible_date(groups[1])
                        if start and end:
                            return {"start": start, "end": end}
                    elif len(groups) == 3:
                        year = int(groups[2])
                        start = self._parse_flexible_date(f"{groups[0]} {year}")
                        end = self._parse_flexible_date(f"{groups[1]} {year}")
                        if start and end:
                            return {"start": start, "end": end}
                except Exception:
                    continue

        return None

    def _parse_flexible_date(self, date_str: str) -> Optional[datetime]:
        """Parse date with flexible format handling."""
        formats = [
            "%B %d, %Y",  # January 15, 2024
            "%b %d, %Y",  # Jan 15, 2024
            "%B %d %Y",  # January 15 2024
            "%b %d %Y",  # Jan 15 2024
            "%m/%d/%Y",
            "%m/%d/%y",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue

        return None
