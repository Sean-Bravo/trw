"""
Bank Statement PDF Converter Service

Converts bank statement PDFs to QBO/Xero compatible CSV formats.

MVP: pdfplumber only (digital PDFs)
Post-MVP: Add Textract for scanned/image PDFs if needed
"""

from .fingerprinter import BankFingerprinter
from .extractor import TransactionExtractor
from .normalizer import TransactionNormalizer
from .duplicate_detector import DuplicateDetector
from .exporter import AccountingExporter
from .processor import BankStatementProcessor, process_bank_statement

__all__ = [
    "BankFingerprinter",
    "TransactionExtractor",
    "TransactionNormalizer",
    "DuplicateDetector",
    "AccountingExporter",
    "BankStatementProcessor",
    "process_bank_statement",
]
