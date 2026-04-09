"""
Accounting Exporter - Export transactions to QBO/Xero CSV formats.
"""

import csv
import logging
import re
import sys
import os
from io import StringIO
from typing import Any, Dict, List

# M-10: csv_safety lives one directory up. Add the parent dir to sys.path
# so this module imports correctly under both Lambda packaging (where
# everything is flattened to /var/task) and local pytest runs.
_parent = os.path.join(os.path.dirname(__file__), "..")
if _parent not in sys.path:
    sys.path.insert(0, _parent)
from csv_safety import sanitize_csv_row as _sanitize_row  # noqa: E402

logger = logging.getLogger(__name__)


class AccountingExporter:
    """Export transactions to accounting software formats."""

    def to_qbo(self, transactions: List[Dict[str, Any]]) -> str:
        """
        Export to QuickBooks Online CSV format.

        QBO expects:
        - Date: MM/DD/YYYY format
        - Description: Transaction description
        - Amount: Negative = expense, Positive = income

        Args:
            transactions: Normalized transactions

        Returns:
            CSV string ready for QBO import
        """
        output = StringIO()
        writer = csv.writer(output)

        # QBO header
        writer.writerow(["Date", "Description", "Amount"])

        for tx in transactions:
            # Convert date to QBO format (MM/DD/YYYY)
            date = self._format_date_qbo(tx.get("date", ""))
            description = tx.get("description", "")
            amount = tx.get("amount", 0)

            writer.writerow(_sanitize_row([date, description, f"{amount:.2f}"]))

        result = output.getvalue()
        logger.info(f"Exported {len(transactions)} transactions to QBO format")
        return result

    def to_xero(self, transactions: List[Dict[str, Any]]) -> str:
        """
        Export to Xero CSV format.

        Xero expects:
        - *Date: Required, DD/MM/YYYY format (or as configured)
        - *Amount: Required, transaction amount
        - Payee: Optional, extracted from description
        - Description: Full transaction description
        - Reference: Optional
        - Check Number: Optional

        Args:
            transactions: Normalized transactions

        Returns:
            CSV string ready for Xero import
        """
        output = StringIO()
        writer = csv.writer(output)

        # Xero header (* denotes required fields)
        writer.writerow(
            ["*Date", "*Amount", "Payee", "Description", "Reference", "Cheque Number"]
        )

        for tx in transactions:
            date = self._format_date_xero(tx.get("date", ""))
            amount = tx.get("amount", 0)
            description = tx.get("description", "")
            payee = self._extract_payee(description)

            writer.writerow(
                _sanitize_row([
                    date,
                    f"{amount:.2f}",
                    payee,
                    description,
                    "",  # Reference
                    "",  # Cheque Number
                ])
            )

        result = output.getvalue()
        logger.info(f"Exported {len(transactions)} transactions to Xero format")
        return result

    def to_excel_generic(self, transactions: List[Dict[str, Any]]) -> str:
        """
        Export to generic Excel-compatible CSV.

        Includes all available fields for maximum flexibility.

        Args:
            transactions: Normalized transactions

        Returns:
            CSV string
        """
        output = StringIO()
        writer = csv.writer(output)

        # Generic header with all useful fields
        writer.writerow(
            ["Date", "Description", "Amount", "Debit", "Credit", "Balance", "Category"]
        )

        for tx in transactions:
            date = tx.get("date", "")
            description = tx.get("description", "")
            amount = tx.get("amount", 0)

            # Split into debit/credit columns
            debit = abs(amount) if amount < 0 else ""
            credit = amount if amount > 0 else ""

            writer.writerow(
                _sanitize_row([
                    date,
                    description,
                    f"{amount:.2f}",
                    f"{debit:.2f}" if debit else "",
                    f"{credit:.2f}" if credit else "",
                    "",  # Balance - not tracked
                    "",  # Category - not inferred
                ])
            )

        result = output.getvalue()
        logger.info(
            f"Exported {len(transactions)} transactions to generic Excel format"
        )
        return result

    def _format_date_qbo(self, date_str: str) -> str:
        """
        Format date for QBO (MM/DD/YYYY).

        Handles YYYY-MM-DD input format.
        """
        if not date_str:
            return ""

        # If already in MM/DD/YYYY format, return as-is
        if re.match(r"\d{1,2}/\d{1,2}/\d{4}", date_str):
            return date_str

        # Convert from YYYY-MM-DD
        match = re.match(r"(\d{4})-(\d{1,2})-(\d{1,2})", date_str)
        if match:
            year, month, day = match.groups()
            return f"{int(month)}/{int(day)}/{year}"

        return date_str

    def _format_date_xero(self, date_str: str) -> str:
        """
        Format date for Xero (DD/MM/YYYY by default, but Xero is flexible).

        We'll use YYYY-MM-DD which Xero also accepts.
        """
        if not date_str:
            return ""

        # If already in YYYY-MM-DD, return as-is (Xero accepts this)
        if re.match(r"\d{4}-\d{1,2}-\d{1,2}", date_str):
            return date_str

        # Convert from MM/DD/YYYY to YYYY-MM-DD
        match = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", date_str)
        if match:
            month, day, year = match.groups()
            return f"{year}-{int(month):02d}-{int(day):02d}"

        return date_str

    def _extract_payee(self, description: str) -> str:
        """
        Extract payee name from description.

        Common patterns:
        - "VENMO PAYMENT TO John Doe"
        - "ACH DEBIT NETFLIX"
        - "WIRE TRANSFER FROM ABC Corp"
        """
        if not description:
            return ""

        description_upper = description.upper()

        # Patterns that indicate what follows is the payee
        payee_indicators = [
            (" TO ", True),  # "PAYMENT TO John Doe" -> extract after
            (" FROM ", True),  # "TRANSFER FROM ABC" -> extract after
            (" - ", True),  # "PURCHASE - Amazon" -> extract after
            ("ACH DEBIT ", True),  # "ACH DEBIT NETFLIX" -> extract after
            ("ACH CREDIT ", True),
            ("WIRE TRANSFER ", True),
            ("DIRECT DEP ", True),
            ("POS PURCHASE ", True),
            ("DEBIT CARD ", True),
        ]

        for indicator, extract_after in payee_indicators:
            if indicator in description_upper:
                idx = description_upper.index(indicator)
                if extract_after:
                    remainder = description[idx + len(indicator) :].strip()
                else:
                    remainder = description[:idx].strip()

                # Take first 3-4 words as payee
                words = remainder.split()[:4]
                return " ".join(words)

        # Default: first 3 words of description
        words = description.split()[:3]
        return " ".join(words)

    def export(
        self, transactions: List[Dict[str, Any]], format: str
    ) -> str:
        """
        Export transactions to specified format.

        Args:
            transactions: Normalized transactions
            format: Output format ('qbo', 'xero', 'excel')

        Returns:
            CSV string in requested format
        """
        format_lower = format.lower()

        if format_lower in ("qbo", "quickbooks"):
            return self.to_qbo(transactions)
        elif format_lower == "xero":
            return self.to_xero(transactions)
        elif format_lower in ("excel", "generic", "csv"):
            return self.to_excel_generic(transactions)
        else:
            logger.warning(f"Unknown format '{format}', using generic")
            return self.to_excel_generic(transactions)

    def get_supported_formats(self) -> List[Dict[str, str]]:
        """Get list of supported export formats."""
        return [
            {
                "id": "qbo",
                "name": "QuickBooks Online",
                "description": "3-column CSV for QBO bank import",
            },
            {
                "id": "xero",
                "name": "Xero",
                "description": "6-column CSV for Xero bank reconciliation",
            },
            {
                "id": "excel",
                "name": "Excel/Generic",
                "description": "Full detail CSV for spreadsheet analysis",
            },
        ]
