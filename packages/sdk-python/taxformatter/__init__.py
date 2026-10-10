"""TaxFormatter Python SDK — parse crypto CSVs and bank statement PDFs."""

from .client import TaxFormatter
from .errors import TaxFormatterError, AuthenticationError, RateLimitError, ParseError

__version__ = "1.0.0"
__all__ = [
    "TaxFormatter",
    "TaxFormatterError",
    "AuthenticationError",
    "RateLimitError",
    "ParseError",
]
