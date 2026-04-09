"""
CSV formula injection sanitization (M-10).

Bank parsers and crypto exchange parsers extract arbitrary text from
PDFs / CSVs uploaded by users. If a malicious description starts with
=, +, -, @, tab, or carriage return, Excel/LibreOffice will interpret
the cell as a formula when the user opens the exported CSV — including
legacy DDE vectors like =cmd|'/c calc'!A1.

Prefixing such cells with a leading apostrophe forces them to render
as text. The apostrophe is invisible in the spreadsheet UI but
neutralizes the formula.

See SECURITY_AUDIT.md §M-10
"""

from typing import Any, Dict, Iterable, List

_FORMULA_TRIGGERS = ("=", "+", "-", "@", "\t", "\r")


def sanitize_csv_cell(value: Any) -> Any:
    """Prefix dangerous strings with ' so spreadsheets render as text."""
    if not isinstance(value, str) or not value:
        return value
    if value[0] in _FORMULA_TRIGGERS:
        return "'" + value
    return value


def sanitize_csv_row(row: Iterable[Any]) -> List[Any]:
    return [sanitize_csv_cell(cell) for cell in row]


def sanitize_csv_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize every value in a DictWriter record (keys are column names)."""
    return {k: sanitize_csv_cell(v) for k, v in record.items()}


def sanitize_csv_records(records: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [sanitize_csv_record(r) for r in records]
