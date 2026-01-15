"""
TaxReadyWallet Engine - ULTIMATE PRODUCTION VERSION v3.0
Now supports 13 EXCHANGES with enhanced validation and user success features

TIER 1 (Enterprise): Binance, Coinbase, Kraken, KuCoin, Bybit
TIER 2 (Beginner): Cash App, Robinhood, PayPal/Venmo
TIER 3 (Power Users): Crypto.com, Gemini
TIER 4 (Advanced): FTX, Bitfinex, OKX

NEW FEATURES:
- Intelligent error recovery with actionable suggestions
- Price anomaly detection (warns if prices seem unusual)
- Transaction categorization hints for tax software
- Fuzzy column matching for format variations
- Enhanced date parsing (20+ formats supported)
- Currency normalization (handles exchange-specific naming)
"""

import io
import re
import csv
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
from functools import lru_cache

import pandas as pd

try:
    import chardet
except ImportError:
    chardet = None

# ============================================================================
# FINGERPRINTING & CACHING IMPORTS
# ============================================================================

FINGERPRINTING_AVAILABLE = False
config_store = None

try:
    from services.fingerprinting import generate_fingerprint, detect_exchange_from_headers
    from services.storage import (
        ConfigStore,
        get_config_by_hash,
        save_new_config,
        increment_usage_count
    )
    FINGERPRINTING_AVAILABLE = True
    config_store = ConfigStore()
except ImportError:
    logger_temp = logging.getLogger(__name__)
    logger_temp.warning("Fingerprinting module not available - config caching disabled")

__version__ = "3.0.0"
__author__ = "TaxReadyWallet Team"

__all__ = [
    'process_file',
    'load_csv_to_df',
    'UniversalRecord',
    'ParseError',
    'ErrorSeverity',
    'TransactionType',
    'ParserRegistry',
    'BinanceParser',
    'CoinbaseParser',
    'KrakenParser',
    'KuCoinParser',
    'BybitParser',
    'CashAppParser',
    'RobinhoodParser',
    'PayPalParser',
    'VenmoParser',
    'CryptoDotComParser',
    'GeminiParser',
    'FTXParser',
    'BitfinexParser',
    'OKXParser',
    '_get_cached_config',
    'check_config_cache',
    'save_config_to_database',
]

logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION CONSTANTS
# ============================================================================

ENCODING_CONFIDENCE_THRESHOLD = 0.7
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
MAX_ROWS = 100_000
MAX_ERRORS_IN_RESPONSE = 100

# Price anomaly detection thresholds
PRICE_ANOMALY_THRESHOLD_HIGH = 1000000  # Warn if price > $1M
PRICE_ANOMALY_THRESHOLD_LOW = 0.0000001  # Warn if price < $0.0000001

KNOWN_QUOTE_CURRENCIES = [
    "USDT", "USDC", "BUSD", "USDS", "TUSD", "GUSD", "DAI", "FRAX",
    "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "NZD", "SGD",
    "BTC", "ETH", "BNB", "XRP", "ADA", "SOL", "DOGE", "MATIC",
    "USD", "CNY", "KRW", "TRY",
]

# Known stablecoins for validation
STABLECOINS = ["USDT", "USDC", "BUSD", "DAI", "TUSD", "GUSD", "USDS", "FRAX"]

# ============================================================================
# TYPE DEFINITIONS
# ============================================================================

class TransactionType(str, Enum):
    """Supported transaction types"""
    BUY = "buy"
    SELL = "sell"
    DEPOSIT = "deposit"
    WITHDRAW = "withdraw"
    TRANSFER = "transfer"
    STAKING_REWARD = "staking_reward"
    INTEREST = "interest"
    CASHBACK = "cashback"
    AIRDROP = "airdrop"
    SWAP = "swap"
    OTHER = "other"

class ErrorSeverity(str, Enum):
    """Error severity levels"""
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class UniversalRecord:
    """
    Universal transaction record matching Koinly CSV format.
    
    All string fields are sanitized against CSV injection attacks
    when converted to dict.
    """
    Date: str
    Sent_Amount: float
    Sent_Currency: str
    Received_Amount: float
    Received_Currency: str
    Fee_Amount: float
    Fee_Currency: str
    Description: str
    TxHash: Optional[str] = None  # NEW: Optional transaction hash
    Label: Optional[str] = None   # NEW: Optional tax label hint
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert to dict with Koinly-compatible column names (spaces) 
        and CSV injection protection.
        """
        base_dict = {
            "Date": sanitize_csv_value(self.Date),
            "Sent Amount": self.Sent_Amount,
            "Sent Currency": sanitize_csv_value(self.Sent_Currency),
            "Received Amount": self.Received_Amount,
            "Received Currency": sanitize_csv_value(self.Received_Currency),
            "Fee Amount": self.Fee_Amount,
            "Fee Currency": sanitize_csv_value(self.Fee_Currency),
            "Description": sanitize_csv_value(self.Description),
        }
        
        # Add optional fields if present
        if self.TxHash:
            base_dict["TxHash"] = sanitize_csv_value(self.TxHash)
        if self.Label:
            base_dict["Label"] = sanitize_csv_value(self.Label)
            
        return base_dict

@dataclass
class ParseError:
    """
    Detailed error information for failed row parsing.
    """
    row: int
    message: str
    severity: ErrorSeverity
    data: Optional[Dict[str, Any]] = None
    suggestion: Optional[str] = None  # NEW: Actionable recovery suggestion
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict for JSON serialization"""
        result = {
            "row": self.row,
            "message": self.message,
            "severity": self.severity.value,
            "data": self.data,
        }
        if self.suggestion:
            result["suggestion"] = self.suggestion
        return result

# ============================================================================
# IN-MEMORY CACHE
# ============================================================================

@lru_cache(maxsize=100)
def _get_cached_config(fingerprint: str):
    """
    Get config from in-memory cache.
    
    Uses LRU cache to avoid repeated database queries for the same fingerprint.
    Cache automatically evicts least recently used entries when maxsize is exceeded.
    
    Args:
        fingerprint: The SHA256 hash of CSV headers
        
    Returns:
        Config object if found, None otherwise
    """
    if config_store is None:
        return None
    return config_store.get_by_fingerprint(fingerprint)


# ============================================================================
# CACHE CHECKING & SAVING FUNCTIONS
# ============================================================================

def check_config_cache(fingerprint: str):
    """
    Check for cached config by fingerprint.
    
    Returns config object if found, None otherwise.
    """
    try:
        # Check in-memory cache first (fastest)
        config = _get_cached_config(fingerprint)
        if config:
            logger.debug(f"Memory cache hit: {fingerprint}")
            return config
    except Exception as e:
        logger.warning(f"Memory cache error: {e}")
    
    try:
        # Check database cache
        from services.storage import get_config_by_hash
        config = get_config_by_hash(fingerprint)
        if config:
            logger.debug(f"Database cache hit: {fingerprint}")
            return config
    except Exception as e:
        logger.error(f"Database cache error: {e}")
        logger.info("Continuing without cache")
    
    return None


def save_config_to_database(fingerprint: str, exchange: str, mapping: dict):
    """
    Save detected config to database for caching.
    
    Args:
        fingerprint: MD5 hash of CSV headers
        exchange: Exchange name (e.g., "Coinbase", "Binance")
        mapping: Column mapping dictionary
        
    Returns:
        Config object if saved successfully, None otherwise
    """
    try:
        from services.storage import save_new_config
        config = save_new_config(
            fingerprint=fingerprint,
            exchange_name=exchange,
            mapping_config=mapping
        )
        logger.info(f"✓ Saved config: {exchange}")
        
        # Clear LRU cache to ensure fresh data on next request
        _get_cached_config.cache_clear()
        
        return config
    except Exception as e:
        logger.error(f"Failed to save config: {e}")
        logger.warning("Continuing without persistence")
        return None

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def normalize_column(col: str) -> str:
    """Normalize column names: lowercase, strip, replace non-alnum with _."""
    return re.sub(r"[^a-z0-9]+", "_", str(col).strip().lower())

def detect_encoding(content: bytes) -> str:
    """Detect file encoding with fallback to UTF-8."""
    if chardet:
        result = chardet.detect(content)
        if result.get("encoding") and result.get("confidence", 0) > ENCODING_CONFIDENCE_THRESHOLD:
            return result["encoding"]
    return "utf-8"

def detect_delimiter(text: str) -> str:
    """Detect CSV delimiter using csv.Sniffer with fallback."""
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=[',', ';', '\t', '|'])
        return dialect.delimiter
    except csv.Error:
        pass
    
    counts = {
        ",": sample.count(","),
        ";": sample.count(";"),
        "\t": sample.count("\t"),
        "|": sample.count("|"),
    }
    return max(counts, key=counts.get) if counts else ","

def format_date(date_str: str, strict: bool = False) -> str:
    """
    Convert any date format to ISO 8601 format.
    Enhanced to support 20+ date formats.
    """
    if not date_str or pd.isna(date_str):
        if strict:
            raise ValueError("Empty date string")
        return ""
    
    date_str = str(date_str).strip()
    
    # Try parsing with pandas first (handles most formats)
    try:
        dt = pd.to_datetime(date_str, utc=True)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except:
        pass
    
    # Fallback to manual parsing
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d",
        "%d/%m/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M:%S",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%Y/%m/%d",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y",
        "%m-%d-%Y",
        "%b %d, %Y",  # Jan 15, 2024
        "%d %b %Y",   # 15 Jan 2024
        "%B %d, %Y",  # January 15, 2024
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue
    
    if strict:
        raise ValueError(f"Could not parse date: {date_str}")
    
    logger.warning(f"Could not parse date '{date_str}'")
    return ""

def convert_kraken_timestamp(timestamp: Any) -> str:
    """
    Convert Kraken Unix timestamp to ISO 8601 format.

    Args:
        timestamp: Unix timestamp (seconds since epoch) or date string

    Returns:
        Formatted date string (YYYY-MM-DD HH:MM:SS)
    """
    try:
        if pd.isna(timestamp) or timestamp == "" or timestamp is None:
            return ""

        # If it's already a string that looks like a date, try parsing it
        if isinstance(timestamp, str) and not timestamp.replace('.', '').isdigit():
            return format_date(timestamp)

        # Convert to float and create datetime
        ts_float = float(timestamp)
        dt = datetime.utcfromtimestamp(ts_float)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError, OSError) as e:
        logger.warning(f"Could not convert Kraken timestamp '{timestamp}': {e}")
        return ""

def parse_float(value: Any, non_negative: bool = True) -> float:
    """
    Safely parse float from various formats.
    """
    if pd.isna(value) or value == "" or value is None:
        return 0.0
    try:
        clean = str(value).strip().replace("$", "").replace(",", "").replace("€", "").strip()
        result = float(clean) if clean else 0.0
        
        if non_negative and result < 0:
            logger.debug(f"Negative value detected: {result}")
        
        return result
    except (ValueError, TypeError):
        return 0.0

def extract_currency_pair(pair: str) -> Tuple[str, str]:
    """
    Extract base and quote currencies from trading pair.
    Enhanced with better pattern matching.
    """
    if not pair:
        return ("", "")
    
    pair = str(pair).upper().strip()
    
    # Remove common separators
    original_pair = pair
    pair = re.sub(r'[-_/\s]+', '', pair)
    
    # Special cases
    if pair.startswith("XBT"):
        pair = "BTC" + pair[3:]
    
    # Try known quote currencies (longest first to avoid partial matches)
    for quote in sorted(KNOWN_QUOTE_CURRENCIES, key=len, reverse=True):
        if pair.endswith(quote) and len(pair) > len(quote):
            base = pair[:-len(quote)]
            # Validate base currency isn't empty
            if base:
                return (base, quote)
    
    # Length-based splitting
    if len(pair) == 6:
        return (pair[:3], pair[3:])
    elif len(pair) == 7:
        if pair[3:] in KNOWN_QUOTE_CURRENCIES:
            return (pair[:3], pair[3:])
        elif pair[4:] in KNOWN_QUOTE_CURRENCIES:
            return (pair[:4], pair[4:])
        else:
            return (pair[:3], pair[3:])
    elif len(pair) == 8:
        return (pair[:4], pair[4:])
    
    # If original had separator, use that
    if '/' in original_pair:
        parts = original_pair.split('/')
        if len(parts) == 2:
            return (parts[0].strip(), parts[1].strip())
    elif '-' in original_pair:
        parts = original_pair.split('-')
        if len(parts) == 2:
            return (parts[0].strip(), parts[1].strip())
    
    logger.warning(f"Could not parse pair '{pair}', using 50/50 split")
    mid = len(pair) // 2
    return (pair[:mid], pair[mid:])

def normalize_kraken_asset(asset: str) -> str:
    """
    Normalize Kraken asset names.

    Kraken prefixes fiat with 'Z' and crypto with 'X'.
    Examples: ZUSD -> USD, XXBT -> BTC, ZEUR -> EUR

    Args:
        asset: Raw Kraken asset code

    Returns:
        Normalized asset symbol
    """
    if not asset:
        return ""

    asset = str(asset).upper().strip()

    # Special case: XXBT -> BTC (handle before stripping prefixes)
    if asset == "XXBT":
        return "BTC"

    # Special case: XBT -> BTC
    if asset == "XBT":
        return "BTC"

    # Remove Z prefix (fiat) - only once
    if asset.startswith('Z') and len(asset) > 1:
        asset = asset[1:]
    # Remove X prefix (crypto) - only once, and only if not already handled
    elif asset.startswith('X') and len(asset) > 1:
        asset = asset[1:]

    return asset

def sanitize_csv_value(value: Any) -> str:
    """
    Prevent CSV injection attacks by prefixing dangerous characters.
    """
    s = str(value).strip()
    if s and s[0] in ['=', '+', '-', '@']:
        return "'" + s
    return s

def safe_row_data(row: Any) -> Dict[str, Any]:
    """
    Safely convert row to dict for error reporting.
    """
    try:
        if hasattr(row, '_asdict'):
            data = dict(row._asdict())
            return {
                k: str(v) if not isinstance(v, (str, int, float, bool, type(None))) else v
                for k, v in data.items()
            }
        elif hasattr(row, 'to_dict'):
            return row.to_dict()
        elif isinstance(row, dict):
            return row
        return {"raw": str(row)}
    except Exception:
        return {"error": "Could not serialize row data"}

def validate_required_columns(df: pd.DataFrame, required: List[str]) -> List[str]:
    """
    Check if DataFrame has all required columns.
    """
    df_cols_lower = [col.lower() for col in df.columns]
    missing = [col for col in required if col.lower() not in df_cols_lower]
    return missing

def validate_price(price: float, base_currency: str, quote_currency: str) -> Optional[str]:
    """
    NEW: Validate if price seems reasonable.
    Returns warning message if price seems anomalous.
    """
    if price <= 0:
        return None
    
    # Check for extremely high prices
    if price > PRICE_ANOMALY_THRESHOLD_HIGH:
        return f"⚠️ Unusually high price: ${price:,.2f} for {base_currency}/{quote_currency}"
    
    # Check for extremely low prices
    if price < PRICE_ANOMALY_THRESHOLD_LOW:
        return f"⚠️ Unusually low price: ${price:.10f} for {base_currency}/{quote_currency}"
    
    # Stablecoin price check (should be ~$1)
    if quote_currency == "USD" and base_currency in STABLECOINS:
        if price < 0.90 or price > 1.10:
            return f"⚠️ Stablecoin {base_currency} price is ${price:.4f} (should be ~$1.00)"
    
    return None

def configure_logging(level: str = "INFO") -> None:
    """
    Configure module logging level.
    """
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

# ============================================================================
# BASE PARSER CLASS
# ============================================================================

class BaseExchangeParser(ABC):
    """
    Base class for exchange-specific parsers.
    """
    
    exchange_name: str = "Unknown"
    strict_validation: bool = False
    COLUMN_MAPPING: Dict[str, str] = {}
    
    @abstractmethod
    def get_required_columns(self) -> List[str]:
        """Return list of required column names."""
        pass
    
    @abstractmethod
    def parse(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """
        Parse DataFrame to universal schema.
        
        Returns:
            (records, errors) tuple
        """
        pass
    
    def validate(self, df: pd.DataFrame) -> List[str]:
        """Validate DataFrame has required columns."""
        required = self.get_required_columns()
        missing = validate_required_columns(df, required)
        if missing:
            return [f"{self.exchange_name}: Missing required columns: {', '.join(missing)}"]
        return []
    
    def normalize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Normalize column names and apply exchange-specific mapping.
        """
        df = df.copy()
        df.columns = [normalize_column(col) for col in df.columns]
        if self.COLUMN_MAPPING:
            df = df.rename(columns=self.COLUMN_MAPPING)
        return df

# ============================================================================
# TIER 1: ENTERPRISE EXCHANGE PARSERS (5)
# ============================================================================

class BinanceParser(BaseExchangeParser):
    """Parse Binance spot trading CSV exports."""
    
    exchange_name = "Binance"
    
    COLUMN_MAPPING = {
        'date_utc_': 'date',
        'date_utc': 'date',
        'fee_coin': 'fee_currency',
        'executed': 'amount',           # Binance uses "Executed" for quantity
        'avgtrading_price': 'price',    # Maps "AvgTrading Price"
        'order_price': 'price',         # Alternative price column
        'type': 'side',                 # Some exports use "Type" instead of "Side"
    }

    def get_required_columns(self) -> List[str]:
        return ['date(utc)', 'pair']
    
    def parse(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Transform Binance CSV to universal schema."""
        df = self.normalize_columns(df)
        
        if 'fee' not in df.columns:
            df['fee'] = 0.0
        if 'fee_currency' not in df.columns:
            df['fee_currency'] = ''
        
        records = []
        errors = []
        
        for row in df.itertuples(index=True, name='Row'):
            idx = row.Index
            try:
                date = format_date(row.date, strict=self.strict_validation)
                if not date:
                    raise ValueError("Invalid or missing date")
                
                pair = str(row.pair).upper().strip()
                base_curr, quote_curr = extract_currency_pair(pair)
                side = str(row.side).upper().strip()
                
                amount = parse_float(row.amount)
                price = parse_float(row.price)
                fee = parse_float(row.fee)
                fee_coin = str(row.fee_currency).upper().strip() or base_curr
                
                if amount <= 0:
                    raise ValueError(f"Invalid amount: {amount} (must be > 0)")
                if price <= 0:
                    raise ValueError(f"Invalid price: {price} (must be > 0)")
                
                if not all([base_curr, quote_curr, side]):
                    raise ValueError(f"Invalid data: pair={base_curr}/{quote_curr}, side={side}")
                
                if side not in ["BUY", "SELL"]:
                    raise ValueError(f"Unknown side: {side}")
                
                # Price validation (NEW)
                price_warning = validate_price(price, base_curr, quote_curr)
                if price_warning:
                    logger.warning(f"Row {idx}: {price_warning}")
                
                total_cost = amount * price
                
                if side == "BUY":
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=total_cost,
                        Sent_Currency=quote_curr,
                        Received_Amount=amount,
                        Received_Currency=base_curr,
                        Fee_Amount=fee,
                        Fee_Currency=fee_coin,
                        Description=f"Binance {side.lower()}",
                        Label="trade"  # NEW: Tax categorization hint
                    )
                else:  # SELL
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=amount,
                        Sent_Currency=base_curr,
                        Received_Amount=total_cost,
                        Received_Currency=quote_curr,
                        Fee_Amount=fee,
                        Fee_Currency=fee_coin,
                        Description=f"Binance {side.lower()}",
                        Label="trade"
                    )
                
                records.append(record.to_dict())
                
            except Exception as e:
                errors.append(ParseError(
                    row=idx,
                    message=str(e),
                    severity=ErrorSeverity.ERROR,
                    data=safe_row_data(row),
                    suggestion="Check that Date(UTC), Pair, Side, Amount, and Price columns are present and valid"
                ))
        
        return records, errors


class CoinbaseParser(BaseExchangeParser):
    """Parse Coinbase transaction CSV exports."""

    exchange_name = "Coinbase"

    COLUMN_MAPPING = {
        'timestamp': 'date',
        'transaction_type': 'type',     # Coinbase uses "Transaction Type"
        'asset': 'currency',            # Coinbase uses "Asset" not "Currency"
        'quantity_transacted': 'amount', # Coinbase uses "Quantity Transacted"
        'fees_and_or_spread': 'fee',    # "Fees and/or Spread" normalized
        'spot_price_at_transaction': 'price',
        # New 2025 Coinbase format
        'price_at_transaction': 'price',  # "Price at Transaction" (no "Spot")
        'price_currency': 'quote_currency',  # "Price Currency"
        'total_inclusive_of_fees_and_or_spread_': 'total',  # Full column name normalized
        # Coinbase Pro mappings
        'created_at': 'date',           # Pro format
        'product': 'pair',              # Pro format
        'size': 'amount',               # Pro format
    }

    def get_required_columns(self) -> List[str]:
        return ['timestamp']

    def parse(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Transform Coinbase CSV to universal schema."""
        df = self.normalize_columns(df)

        for col in ['total', 'fee']:
            if col not in df.columns:
                df[col] = 0.0

        records = []
        errors = []

        for row in df.itertuples(index=True, name='Row'):
            idx = row.Index
            try:
                date = format_date(row.date, strict=self.strict_validation)
                if not date:
                    raise ValueError("Invalid or missing date")

                tx_type = str(row.type).upper().strip()
                currency = str(row.currency).upper().strip()

                # Handle negative amounts (Coinbase uses negative for sends/withdrawals)
                raw_amount = getattr(row, 'amount', 0)
                if isinstance(raw_amount, str):
                    raw_amount = raw_amount.replace('$', '').replace(',', '')
                amount = abs(float(raw_amount)) if raw_amount else 0.0

                if not currency:
                    raise ValueError("Missing currency")
                if amount <= 0:
                    raise ValueError(f"Invalid amount: {amount} (must be > 0)")

                # Parse total - handle string values with $ signs
                raw_total = getattr(row, 'total', 0)
                if isinstance(raw_total, str):
                    raw_total = raw_total.replace('$', '').replace(',', '')
                total = abs(float(raw_total)) if raw_total else 0.0

                # Parse fee - handle string values with $ signs
                raw_fee = getattr(row, 'fee', 0)
                if isinstance(raw_fee, str):
                    raw_fee = raw_fee.replace('$', '').replace(',', '')
                fee = abs(float(raw_fee)) if raw_fee else 0.0

                # Dynamic Currency Detection
                quote_currency = "USD"
                if hasattr(row, 'quote_currency') and row.quote_currency:
                    quote_currency = str(row.quote_currency).upper().strip()
                elif hasattr(row, 'native_currency') and row.native_currency:
                    quote_currency = str(row.native_currency).upper().strip()

                # Normalize transaction types
                tx_type_upper = tx_type.upper()

                # Map various Coinbase transaction types
                SEND_TYPES = ["SEND", "WITHDRAWAL", "RETAIL MGX DEX SEND"]
                RECEIVE_TYPES = ["RECEIVE", "DEPOSIT"]
                INCOME_TYPES = ["REWARD INCOME", "STAKING INCOME", "LEARNING REWARD", "COINBASE EARN"]
                TRADE_TYPES = ["BUY", "SELL", "CONVERT", "RETAIL MGX DEX TRADE"]

                # Determine label
                if any(t in tx_type_upper for t in ["BUY", "SELL", "CONVERT", "TRADE"]):
                    label = "trade"
                elif any(t in tx_type_upper for t in INCOME_TYPES):
                    label = "income"
                else:
                    label = "transfer"

                if tx_type_upper == "BUY" or "BUY" in tx_type_upper:
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=total + fee if total else amount,
                        Sent_Currency=quote_currency,
                        Received_Amount=amount,
                        Received_Currency=currency,
                        Fee_Amount=fee,
                        Fee_Currency=quote_currency,
                        Description=f"Coinbase {tx_type.lower()}",
                        Label=label
                    )
                elif tx_type_upper == "SELL" or "SELL" in tx_type_upper:
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=amount,
                        Sent_Currency=currency,
                        Received_Amount=total - fee if total else 0,
                        Received_Currency=quote_currency,
                        Fee_Amount=fee,
                        Fee_Currency=quote_currency,
                        Description=f"Coinbase {tx_type.lower()}",
                        Label=label
                    )
                elif tx_type_upper == "CONVERT" or "CONVERT" in tx_type_upper:
                    # Convert: selling one crypto for another
                    # Note: Coinbase shows each side as separate row, amount is negative for "from" side
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=amount,
                        Sent_Currency=currency,
                        Received_Amount=0,  # Will be filled by matching row
                        Received_Currency="",
                        Fee_Amount=fee,
                        Fee_Currency=quote_currency,
                        Description=f"Coinbase {tx_type.lower()}",
                        Label=label
                    )
                elif any(t in tx_type_upper for t in SEND_TYPES):
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=amount,
                        Sent_Currency=currency,
                        Received_Amount=0,
                        Received_Currency="",
                        Fee_Amount=fee,
                        Fee_Currency=currency,
                        Description=f"Coinbase {tx_type.lower()}",
                        Label=label
                    )
                elif any(t in tx_type_upper for t in RECEIVE_TYPES):
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=0,
                        Sent_Currency="",
                        Received_Amount=amount,
                        Received_Currency=currency,
                        Fee_Amount=fee,
                        Fee_Currency=currency,
                        Description=f"Coinbase {tx_type.lower()}",
                        Label=label
                    )
                elif any(t in tx_type_upper for t in INCOME_TYPES):
                    # Staking rewards, learning rewards, etc.
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=0,
                        Sent_Currency="",
                        Received_Amount=amount,
                        Received_Currency=currency,
                        Fee_Amount=0,
                        Fee_Currency="",
                        Description=f"Coinbase {tx_type.lower()}",
                        Label="income"
                    )
                else:
                    # Fallback for unknown types
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=0,
                        Sent_Currency="",
                        Received_Amount=amount,
                        Received_Currency=currency,
                        Fee_Amount=fee,
                        Fee_Currency=currency,
                        Description=f"Coinbase {tx_type.lower()}",
                        Label=label
                    )

                records.append(record.to_dict())

            except Exception as e:
                errors.append(ParseError(
                    row=idx,
                    message=str(e),
                    severity=ErrorSeverity.ERROR,
                    data=safe_row_data(row),
                    suggestion="Ensure your Coinbase export includes Timestamp, Transaction Type, Asset, and Quantity Transacted columns"
                ))

        return records, errors


class KrakenParser(BaseExchangeParser):
    """
    Parse Kraken ledger CSV exports.
    
    SPECIAL HANDLING: Kraken exports trades as TWO rows (one per asset).
    This parser intelligently merges them into single transactions.
    """
    
    exchange_name = "Kraken"
    
    COLUMN_MAPPING = {
        'time': 'date',
        'txid': 'txid',
        'refid': 'refid',
        'type': 'type',
        'asset': 'asset',
        'amount': 'amount',
        'fee': 'fee',
        'balance': 'balance',
    }
    
    def get_required_columns(self) -> List[str]:
        return ['time', 'type', 'asset', 'amount']
    
    def parse(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Transform Kraken CSV to universal schema."""
        df = self.normalize_columns(df)
        
        if 'fee' not in df.columns:
            df['fee'] = 0.0
        if 'refid' not in df.columns:
            df['refid'] = ''
        
        records = []
        errors = []
        processed_refids = set()
        
        for idx, row in df.iterrows():
            try:
                refid = str(row.get('refid', '')).strip()
                if refid and refid in processed_refids:
                    continue
                
                tx_type = str(row.get('type', '')).lower().strip()
                
                if tx_type == 'trade' and refid:
                    trade_group = df[df['refid'] == refid]
                    
                    if len(trade_group) == 2:
                        row1 = trade_group.iloc[0]
                        row2 = trade_group.iloc[1]
                        
                        amount1 = parse_float(row1.get('amount', 0), non_negative=False)
                        amount2 = parse_float(row2.get('amount', 0), non_negative=False)
                        
                        if amount1 < 0 and amount2 > 0:
                            from_row, to_row = row1, row2
                        elif amount2 < 0 and amount1 > 0:
                            from_row, to_row = row2, row1
                        else:
                            from_row = row1 if abs(amount1) > abs(amount2) else row2
                            to_row = row2 if abs(amount1) > abs(amount2) else row1
                        
                        date = convert_kraken_timestamp(from_row.get('date', 0))
                        if not date:
                            raise ValueError("Invalid or missing timestamp")
                        
                        from_asset = normalize_kraken_asset(from_row.get('asset', ''))
                        to_asset = normalize_kraken_asset(to_row.get('asset', ''))
                        from_quantity = abs(parse_float(from_row.get('amount', 0), non_negative=False))
                        to_quantity = abs(parse_float(to_row.get('amount', 0), non_negative=False))
                        
                        fee_quantity = abs(parse_float(from_row.get('fee', 0)))
                        fee_asset = from_asset if fee_quantity > 0 else ""
                        
                        record = UniversalRecord(
                            Date=date,
                            Sent_Amount=from_quantity,
                            Sent_Currency=from_asset,
                            Received_Amount=to_quantity,
                            Received_Currency=to_asset,
                            Fee_Amount=fee_quantity,
                            Fee_Currency=fee_asset,
                            Description=f"Kraken trade ({from_asset}/{to_asset})",
                            Label="trade"
                        )
                        
                        records.append(record.to_dict())
                        processed_refids.add(refid)
                        
                    elif len(trade_group) == 1:
                        logger.warning(f"Single-row trade for refid {refid} - skipping")
                        processed_refids.add(refid)
                    else:
                        errors.append(ParseError(
                            row=idx,
                            message=f"Trade has {len(trade_group)} rows (expected 2)",
                            severity=ErrorSeverity.ERROR,
                            data={"refid": refid},
                            suggestion="Kraken trades should have exactly 2 rows per refid. Check your export format."
                        ))
                        processed_refids.add(refid)
                
                elif tx_type == 'deposit':
                    date = convert_kraken_timestamp(row.get('date', 0))
                    if not date:
                        raise ValueError("Invalid timestamp")
                    
                    asset = normalize_kraken_asset(row.get('asset', ''))
                    amount = abs(parse_float(row.get('amount', 0), non_negative=False))
                    fee = abs(parse_float(row.get('fee', 0)))
                    
                    if amount == 0:
                        continue
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=0,
                        Sent_Currency="",
                        Received_Amount=amount,
                        Received_Currency=asset,
                        Fee_Amount=fee,
                        Fee_Currency=asset if fee > 0 else "",
                        Description="Kraken deposit",
                        Label="deposit"
                    )
                    
                    records.append(record.to_dict())
                    if refid:
                        processed_refids.add(refid)
                
                elif tx_type == 'withdrawal':
                    date = convert_kraken_timestamp(row.get('date', 0))
                    if not date:
                        raise ValueError("Invalid timestamp")
                    
                    asset = normalize_kraken_asset(row.get('asset', ''))
                    amount = abs(parse_float(row.get('amount', 0), non_negative=False))
                    fee = abs(parse_float(row.get('fee', 0)))
                    
                    if amount == 0:
                        continue
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=amount + fee,
                        Sent_Currency=asset,
                        Received_Amount=0,
                        Received_Currency="",
                        Fee_Amount=fee,
                        Fee_Currency=asset if fee > 0 else "",
                        Description="Kraken withdrawal",
                        Label="withdrawal"
                    )
                    
                    records.append(record.to_dict())
                    if refid:
                        processed_refids.add(refid)
                
                elif tx_type in ['staking', 'earn', 'reward', 'income']:
                    date = convert_kraken_timestamp(row.get('date', 0))
                    if not date:
                        raise ValueError("Invalid timestamp")
                    
                    asset = normalize_kraken_asset(row.get('asset', ''))
                    amount = abs(parse_float(row.get('amount', 0), non_negative=False))
                    
                    if amount == 0:
                        continue
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=0,
                        Sent_Currency="",
                        Received_Amount=amount,
                        Received_Currency=asset,
                        Fee_Amount=0,
                        Fee_Currency="",
                        Description=f"Kraken {tx_type}",
                        Label="reward"
                    )
                    
                    records.append(record.to_dict())
                    if refid:
                        processed_refids.add(refid)
                
                elif tx_type == 'transfer':
                    logger.debug(f"Row {idx}: Skipping internal transfer")
                    if refid:
                        processed_refids.add(refid)
                
                else:
                    logger.debug(f"Row {idx}: Skipping transaction type '{tx_type}'")
                    if refid:
                        processed_refids.add(refid)
                    
            except Exception as e:
                errors.append(ParseError(
                    row=idx,
                    message=str(e),
                    severity=ErrorSeverity.ERROR,
                    data=safe_row_data(row),
                    suggestion="Ensure you downloaded Kraken Ledgers (not Order History)"
                ))
        
        return records, errors


class KuCoinParser(BaseExchangeParser):
    """Parse KuCoin spot trading CSV exports."""
    
    exchange_name = "KuCoin"
    
    COLUMN_MAPPING = {
        'time': 'date',
        'created_date': 'date',         # KuCoin uses created_date
        'created_at': 'date',           # Or created_at (Unix timestamp)
        'trade_pair': 'pair',
        'symbol': 'pair',               # KuCoin uses "symbol" for pair
        'side': 'side',
        'direction': 'side',            # KuCoin uses "direction" (lowercase buy/sell)
        'price': 'price',
        'deal_price': 'price',          # KuCoin uses "deal_price"
        'amount': 'amount',
        'fee': 'fee',
        'fee_currency': 'fee_currency',
    }

    def get_required_columns(self) -> List[str]:
        return ['amount']
    
    def parse(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Transform KuCoin CSV to universal schema."""
        df = self.normalize_columns(df)
        
        if 'fee' not in df.columns:
            df['fee'] = 0.0
        if 'fee_currency' not in df.columns:
            df['fee_currency'] = ''
        
        records = []
        errors = []
        
        for row in df.itertuples(index=True, name='Row'):
            idx = row.Index
            try:
                date = format_date(row.date, strict=self.strict_validation)
                if not date:
                    raise ValueError("Invalid or missing date")
                
                side = str(row.side).upper().strip()
                if side not in ["BUY", "SELL"]:
                    raise ValueError(f"Unknown side: {side}")
                
                pair = str(row.pair).upper().strip() if hasattr(row, 'pair') else ""
                if '-' in pair:
                    parts = pair.split('-')
                    base_curr, quote_curr = parts[0], parts[1]
                else:
                    base_curr, quote_curr = extract_currency_pair(pair)
                
                amount = parse_float(row.amount)
                price = parse_float(row.price)
                fee = parse_float(row.fee) if hasattr(row, 'fee') else 0.0
                
                if amount <= 0:
                    raise ValueError(f"Invalid amount: {amount}")
                if price <= 0:
                    raise ValueError(f"Invalid price: {price}")
                
                total = amount * price
                fee_currency = str(row.fee_currency).upper().strip() if hasattr(row, 'fee_currency') and row.fee_currency else quote_curr
                
                if side == "BUY":
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=total + (fee if fee_currency == quote_curr else 0),
                        Sent_Currency=quote_curr,
                        Received_Amount=amount - (fee if fee_currency == base_curr else 0),
                        Received_Currency=base_curr,
                        Fee_Amount=fee,
                        Fee_Currency=fee_currency,
                        Description="KuCoin buy",
                        Label="trade"
                    )
                else:
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=amount,
                        Sent_Currency=base_curr,
                        Received_Amount=total - (fee if fee_currency == quote_curr else 0),
                        Received_Currency=quote_curr,
                        Fee_Amount=fee,
                        Fee_Currency=fee_currency,
                        Description="KuCoin sell",
                        Label="trade"
                    )
                
                records.append(record.to_dict())
                
            except Exception as e:
                errors.append(ParseError(
                    row=idx,
                    message=str(e),
                    severity=ErrorSeverity.ERROR,
                    data=safe_row_data(row),
                    suggestion="Verify your KuCoin export has Time, Side, Amount, and Price columns"
                ))
        
        return records, errors


class BybitParser(BaseExchangeParser):
    """Parse Bybit spot trading CSV exports."""
    
    exchange_name = "Bybit"
    
    COLUMN_MAPPING = {
        'time': 'date',
        'execution_time': 'date',       # Bybit uses "Execution Time"
        'order_time': 'date',           # Alternative timestamp
        'symbol': 'pair',
        'side': 'side',
        'price': 'price',
        'filled_price': 'price',        # Bybit uses "Filled Price"
        'avg__filled_price': 'price',   # "Avg. Filled Price" normalized
        'qty': 'amount',
        'quantity': 'amount',
        'filled_qty': 'amount',         # Bybit uses "Filled Qty"
        'exec_qty': 'amount',           # Alternative: "Exec Qty"
        'fee': 'fee',
        'trading_fee': 'fee',           # Bybit uses "Trading Fee"
        'exec_fee': 'fee',              # Alternative: "Exec Fee"
        'fee_currency': 'fee_currency',
        'fee_coin': 'fee_currency',     # Alternative naming
    }

    def get_required_columns(self) -> List[str]:
        return ['symbol', 'side']
    
    def parse(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Transform Bybit CSV to universal schema."""
        df = self.normalize_columns(df)
        
        if 'fee' not in df.columns:
            df['fee'] = 0.0
        if 'fee_currency' not in df.columns:
            df['fee_currency'] = ''
        
        records = []
        errors = []
        
        for row in df.itertuples(index=True, name='Row'):
            idx = row.Index
            try:
                date = format_date(row.date, strict=self.strict_validation)
                if not date:
                    raise ValueError("Invalid or missing date")
                
                side = str(row.side).upper().strip()
                if side not in ["BUY", "SELL"]:
                    raise ValueError(f"Unknown side: {side}")
                
                pair = str(row.pair).upper().strip() if hasattr(row, 'pair') else ""
                base_curr, quote_curr = extract_currency_pair(pair)
                
                if not all([base_curr, quote_curr]):
                    raise ValueError(f"Could not parse pair: {pair}")
                
                amount = parse_float(row.amount) if hasattr(row, 'amount') else 0.0
                price = parse_float(row.price)
                fee = parse_float(row.fee) if hasattr(row, 'fee') else 0.0
                
                if amount <= 0:
                    raise ValueError(f"Invalid amount: {amount}")
                if price <= 0:
                    raise ValueError(f"Invalid price: {price}")
                
                total = amount * price
                fee_currency = str(row.fee_currency).upper().strip() if hasattr(row, 'fee_currency') and row.fee_currency else quote_curr
                
                if side == "BUY":
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=total + (fee if fee_currency == quote_curr else 0),
                        Sent_Currency=quote_curr,
                        Received_Amount=amount - (fee if fee_currency == base_curr else 0),
                        Received_Currency=base_curr,
                        Fee_Amount=fee,
                        Fee_Currency=fee_currency,
                        Description="Bybit buy",
                        Label="trade"
                    )
                else:
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=amount,
                        Sent_Currency=base_curr,
                        Received_Amount=total - (fee if fee_currency == quote_curr else 0),
                        Received_Currency=quote_curr,
                        Fee_Amount=fee,
                        Fee_Currency=fee_currency,
                        Description="Bybit sell",
                        Label="trade"
                    )
                
                records.append(record.to_dict())
                
            except Exception as e:
                errors.append(ParseError(
                    row=idx,
                    message=str(e),
                    severity=ErrorSeverity.ERROR,
                    data=safe_row_data(row),
                    suggestion="Check that your Bybit export includes Time, Side, Symbol, and Price"
                ))
        
        return records, errors


# ============================================================================
# TIER 2: BEGINNER-FRIENDLY PARSERS (4)
# ============================================================================

class CashAppParser(BaseExchangeParser):
    """Parse Cash App Bitcoin CSV exports."""
    
    exchange_name = "Cash App"
    
    COLUMN_MAPPING = {
        'date': 'date',
        'transaction_type': 'type',
        'asset_type': 'asset',
        'asset_amount': 'crypto_amount',
        'currency': 'fiat_currency',
        'amount': 'fiat_amount',
        'fee': 'fee',
        'status': 'status',
    }
    
    def get_required_columns(self) -> List[str]:
        return ['date', 'transaction type', 'asset type', 'amount']
    
    def parse(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Transform Cash App CSV to universal schema."""
        df = self.normalize_columns(df)
        
        if 'fee' not in df.columns:
            df['fee'] = 0.0
        if 'status' not in df.columns:
            df['status'] = 'completed'
        if 'crypto_amount' not in df.columns:
            df['crypto_amount'] = 0.0
        if 'fiat_amount' not in df.columns:
            df['fiat_amount'] = 0.0
        
        records = []
        errors = []
        
        for row in df.itertuples(index=True, name='Row'):
            idx = row.Index
            try:
                status = str(getattr(row, 'status', 'completed')).lower().strip()
                if status in ['pending', 'failed', 'cancelled', 'canceled']:
                    continue
                
                tx_type = str(row.type).lower().strip()
                asset = str(getattr(row, 'asset', 'bitcoin')).upper().strip()
                
                if 'bitcoin' not in tx_type.lower() and asset not in ['BTC', 'BITCOIN']:
                    continue
                
                date = format_date(row.date, strict=self.strict_validation)
                if not date:
                    raise ValueError("Invalid or missing date")
                
                crypto_amount = abs(parse_float(getattr(row, 'crypto_amount', 0), non_negative=False))
                fiat_amount = abs(parse_float(getattr(row, 'fiat_amount', 0), non_negative=False))
                fee = abs(parse_float(getattr(row, 'fee', 0)))
                fiat_currency = str(getattr(row, 'fiat_currency', 'USD')).upper().strip() or 'USD'
                
                if 'buy' in tx_type or 'purchase' in tx_type:
                    if crypto_amount <= 0:
                        raise ValueError(f"Invalid crypto amount: {crypto_amount}")
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=fiat_amount + fee,
                        Sent_Currency=fiat_currency,
                        Received_Amount=crypto_amount,
                        Received_Currency='BTC',
                        Fee_Amount=fee,
                        Fee_Currency=fiat_currency,
                        Description="Cash App Bitcoin buy",
                        Label="trade"
                    )
                
                elif 'sell' in tx_type:
                    if crypto_amount <= 0:
                        raise ValueError(f"Invalid crypto amount: {crypto_amount}")
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=crypto_amount,
                        Sent_Currency='BTC',
                        Received_Amount=fiat_amount - fee,
                        Received_Currency=fiat_currency,
                        Fee_Amount=fee,
                        Fee_Currency=fiat_currency,
                        Description="Cash App Bitcoin sell",
                        Label="trade"
                    )
                
                elif 'deposit' in tx_type or 'receive' in tx_type:
                    if crypto_amount <= 0:
                        raise ValueError(f"Invalid crypto amount: {crypto_amount}")
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=0,
                        Sent_Currency="",
                        Received_Amount=crypto_amount,
                        Received_Currency='BTC',
                        Fee_Amount=0,
                        Fee_Currency="",
                        Description="Cash App Bitcoin deposit",
                        Label="deposit"
                    )
                
                elif 'withdrawal' in tx_type or 'send' in tx_type:
                    if crypto_amount <= 0:
                        raise ValueError(f"Invalid crypto amount: {crypto_amount}")
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=crypto_amount + (fee if fee > 0 else 0),
                        Sent_Currency='BTC',
                        Received_Amount=0,
                        Received_Currency="",
                        Fee_Amount=fee,
                        Fee_Currency='BTC' if fee > 0 else "",
                        Description="Cash App Bitcoin withdrawal",
                        Label="withdrawal"
                    )
                
                else:
                    logger.warning(f"Row {idx}: Unknown Cash App transaction: {tx_type}")
                    continue
                
                records.append(record.to_dict())
                
            except Exception as e:
                errors.append(ParseError(
                    row=idx,
                    message=f"Cash App: {str(e)}",
                    severity=ErrorSeverity.ERROR,
                    data=safe_row_data(row),
                    suggestion="Download from: Cash App → Profile → Statements → Export Bitcoin Transactions"
                ))
        
        return records, errors


class RobinhoodParser(BaseExchangeParser):
    """
    Parse Robinhood Crypto CSV exports.
    
    NOTE: Robinhood hides fees in pricing. We estimate at 0.5% for tax safety.
    """
    
    exchange_name = "Robinhood"
    
    COLUMN_MAPPING = {
        'activity_date': 'date',
        'type': 'type',
        'token': 'currency',
        'quantity_transacted': 'quantity',
        'price': 'price',
        'amount': 'amount',
    }
    
    def get_required_columns(self) -> List[str]:
        return ['activity date', 'type', 'token', 'quantity transacted']
    
    def parse(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Transform Robinhood CSV to universal schema."""
        df = self.normalize_columns(df)
        
        if 'price' not in df.columns:
            df['price'] = 0.0
        if 'amount' not in df.columns:
            df['amount'] = 0.0
        
        records = []
        errors = []
        
        # Robinhood fee estimation (they hide it in spread)
        ESTIMATED_FEE_RATE = 0.005  # 0.5%
        
        for row in df.itertuples(index=True, name='Row'):
            idx = row.Index
            try:
                date = format_date(row.date, strict=self.strict_validation)
                if not date:
                    raise ValueError("Invalid or missing date")
                
                tx_type = str(row.type).upper().strip()
                currency = str(row.currency).upper().strip()
                quantity = abs(parse_float(row.quantity, non_negative=False))
                
                price = parse_float(getattr(row, 'price', 0))
                amount = parse_float(getattr(row, 'amount', 0))
                
                if amount == 0 and price > 0 and quantity > 0:
                    amount = price * quantity
                
                estimated_fee = amount * ESTIMATED_FEE_RATE
                
                if tx_type == "BUY":
                    if quantity <= 0:
                        raise ValueError(f"Invalid quantity: {quantity}")
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=amount,
                        Sent_Currency='USD',
                        Received_Amount=quantity,
                        Received_Currency=currency,
                        Fee_Amount=estimated_fee,
                        Fee_Currency='USD',
                        Description=f"Robinhood buy (est. {ESTIMATED_FEE_RATE*100}% fee)",
                        Label="trade"
                    )
                
                elif tx_type == "SELL":
                    if quantity <= 0:
                        raise ValueError(f"Invalid quantity: {quantity}")
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=quantity,
                        Sent_Currency=currency,
                        Received_Amount=amount,
                        Received_Currency='USD',
                        Fee_Amount=estimated_fee,
                        Fee_Currency='USD',
                        Description=f"Robinhood sell (est. {ESTIMATED_FEE_RATE*100}% fee)",
                        Label="trade"
                    )
                
                elif tx_type in ["REVERSAL", "CANCEL", "CANCELLED", "CANCELED"]:
                    continue
                
                else:
                    logger.warning(f"Row {idx}: Unknown Robinhood type: {tx_type}")
                    continue
                
                records.append(record.to_dict())
                
            except Exception as e:
                errors.append(ParseError(
                    row=idx,
                    message=f"Robinhood: {str(e)}",
                    severity=ErrorSeverity.ERROR,
                    data=safe_row_data(row),
                    suggestion="Download from: Robinhood → Account → History → Crypto → Export"
                ))
        
        return records, errors


class PayPalParser(BaseExchangeParser):
    """
    Parse PayPal Crypto CSV exports (also works for Venmo).
    
    ENHANCED with fuzzy column matching to handle format variations.
    """
    
    exchange_name = "PayPal"
    
    # Fuzzy matching - multiple possible names per field
    COLUMN_VARIATIONS = {
        'date': ['date', 'transaction_date', 'transaction date', 'datetime', 'created', 'timestamp', 'time'],
        'time': ['time', 'timestamp', 'transaction time'],
        'type': ['type', 'transaction_type', 'transaction type', 'description', 'activity', 'name'],
        'status': ['status', 'transaction status', 'state'],
        'currency': ['currency', 'crypto_currency', 'crypto currency', 'coin', 'asset', 'token', 'cryptocurrency'],
        'gross': ['gross', 'amount', 'total', 'gross_amount', 'gross amount', 'transaction amount', 'value'],
        'fee': ['fee', 'fees', 'transaction fee', 'transaction_fee', 'fee_amount', 'charge'],
        'net': ['net', 'net_amount', 'net amount', 'net_total', 'final amount', 'received amount'],
    }
    
    def normalize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Fuzzy column matching for PayPal format variations."""
        df = df.copy()
        column_map = {}
        mapped_cols = set()
        
        for standard_name, variations in self.COLUMN_VARIATIONS.items():
            for col in df.columns:
                if col in mapped_cols:
                    continue
                    
                col_lower = normalize_column(col)
                
                for variation in variations:
                    variation_normalized = normalize_column(variation)
                    if col_lower == variation_normalized:
                        column_map[col] = standard_name
                        mapped_cols.add(col)
                        logger.debug(f"PayPal: '{col}' → '{standard_name}'")
                        break
                
                if col in column_map:
                    break
        
        df = df.rename(columns=column_map)
        logger.info(f"PayPal: Mapped {len(column_map)}/{len(self.COLUMN_VARIATIONS)} columns")
        
        return df
    
    def validate(self, df: pd.DataFrame) -> List[str]:
        """Check minimum required columns."""
        df = self.normalize_columns(df)
        
        required = ['date', 'type']
        missing = [col for col in required if col not in df.columns]
        
        if missing:
            return [
                f"PayPal: Missing {', '.join(missing)}. "
                "Download from: PayPal → Activity → Statements → Custom → Crypto Trading → Download CSV"
            ]
        
        return []
    
    def get_required_columns(self) -> List[str]:
        return ['date', 'type']
    
    def parse(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Transform PayPal/Venmo CSV to universal schema."""
        df = self.normalize_columns(df)
        
        # Add defaults for optional columns
        for col,default in [('gross',0.0), ('fee',0.0), ('net',0.0), ('status','completed'), ('currency','')]:
            if col not in df.columns:
                df[col] = default
        
        records = []
        errors = []
        
        # Crypto name mapping
        crypto_mapping = {'BITCOIN':'BTC', 'BTC':'BTC', 'ETHEREUM':'ETH', 'ETH':'ETH', 
                         'LITECOIN':'LTC', 'LTC':'LTC', 'BITCOIN CASH':'BCH', 'BCH':'BCH'}
        
        for row in df.itertuples(index=True, name='Row'):
            idx = row.Index
            try:
                status = str(getattr(row, 'status', 'completed')).lower().strip()
                if status in ['pending', 'cancelled', 'canceled', 'denied', 'refunded']:
                    continue
                
                tx_type = str(row.type).lower().strip()
                
                if 'crypto' not in tx_type and 'bitcoin' not in tx_type and 'ethereum' not in tx_type:
                    continue
                
                date_str = str(row.date).strip()
                if hasattr(row, 'time') and row.time and str(row.time) != 'nan':
                    date_str += f" {row.time}"
                date = format_date(date_str, strict=self.strict_validation)
                if not date:
                    raise ValueError("Invalid date")
                
                currency = str(getattr(row, 'currency', '')).upper().strip()
                
                # Extract currency from transaction type if missing
                if not currency:
                    if 'bitcoin' in tx_type or 'btc' in tx_type:
                        currency = 'BITCOIN'
                    elif 'ethereum' in tx_type or 'eth' in tx_type:
                        currency = 'ETHEREUM'
                
                crypto_currency = crypto_mapping.get(currency, currency)
                
                gross = abs(parse_float(getattr(row, 'gross', 0), non_negative=False))
                fee = abs(parse_float(getattr(row, 'fee', 0)))
                net = abs(parse_float(getattr(row, 'net', 0), non_negative=False))
                
                if net == 0 and gross > 0:
                    net = gross - fee
                
                if 'buy' in tx_type or 'purchase' in tx_type:
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=gross + fee,
                        Sent_Currency='USD',
                        Received_Amount=net if net > 0 else gross * 0.95,
                        Received_Currency=crypto_currency,
                        Fee_Amount=fee,
                        Fee_Currency='USD',
                        Description="PayPal crypto buy",
                        Label="trade"
                    )
                
                elif 'sell' in tx_type:
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=gross,
                        Sent_Currency=crypto_currency,
                        Received_Amount=net,
                        Received_Currency='USD',
                        Fee_Amount=fee,
                        Fee_Currency='USD',
                        Description="PayPal crypto sell",
                        Label="trade"
                    )
                
                elif 'send' in tx_type or 'sent' in tx_type:
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=gross,
                        Sent_Currency=crypto_currency,
                        Received_Amount=0,
                        Received_Currency="",
                        Fee_Amount=fee,
                        Fee_Currency=crypto_currency,
                        Description="PayPal crypto send",
                        Label="transfer"
                    )
                
                elif 'receive' in tx_type or 'received' in tx_type:
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=0,
                        Sent_Currency="",
                        Received_Amount=gross,
                        Received_Currency=crypto_currency,
                        Fee_Amount=0,
                        Fee_Currency="",
                        Description="PayPal crypto receive",
                        Label="transfer"
                    )
                
                else:
                    continue
                
                records.append(record.to_dict())
                
            except Exception as e:
                errors.append(ParseError(
                    row=idx,
                    message=f"PayPal: {str(e)}",
                    severity=ErrorSeverity.ERROR,
                    data=safe_row_data(row),
                    suggestion="Ensure CSV includes Date, Type, and Amount columns. Filter for 'Crypto' transactions when exporting."
                ))
        
        return records, errors


class VenmoParser(PayPalParser):
    """Venmo uses identical format to PayPal (alias)."""
    exchange_name = "Venmo"


# ============================================================================
# TIER 3: POWER USER PARSERS (2)
# ============================================================================

class CryptoDotComParser(BaseExchangeParser):
    """Parse Crypto.com App CSV exports (supports 25+ transaction types)."""
    
    exchange_name = "Crypto.com"
    
    COLUMN_MAPPING = {
        'timestamp_utc_': 'date',
        'timestamp__utc_': 'date',
        'transaction_description': 'description',
        'currency': 'currency',
        'amount': 'amount',
        'to_currency': 'to_currency',
        'to_amount': 'to_amount',
        'native_currency': 'native_currency',
        'native_amount': 'native_amount',
        'native_amount__in_usd_': 'usd_amount',
        'transaction_kind': 'kind',
        'transaction_hash': 'hash',
    }
    
    def get_required_columns(self) -> List[str]:
        return ['timestamp (utc)', 'transaction kind', 'currency', 'amount']
    
    def parse(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Transform Crypto.com CSV to universal schema."""
        df = self.normalize_columns(df)
        
        # Add defaults
        for col,default in [('to_currency',''), ('to_amount',0.0), ('native_currency','USD'), ('usd_amount',0.0)]:
            if col not in df.columns:
                df[col] = default
        
        records = []
        errors = []
        
        for row in df.itertuples(index=True, name='Row'):
            idx = row.Index
            try:
                date = format_date(row.date, strict=self.strict_validation)
                if not date:
                    raise ValueError("Invalid date")
                
                kind = str(row.kind).lower().strip()
                currency = str(row.currency).upper().strip()
                amount = abs(parse_float(row.amount, non_negative=False))
                
                to_currency = str(getattr(row, 'to_currency', '')).upper().strip()
                to_amount = abs(parse_float(getattr(row, 'to_amount', 0), non_negative=False))
                native_currency = str(getattr(row, 'native_currency', 'USD')).upper().strip()
                usd_amount = abs(parse_float(getattr(row, 'usd_amount', 0), non_negative=False))
                
                # Determine label based on kind
                if 'purchase' in kind or 'buy' in kind:
                    label = "trade"
                elif 'reward' in kind or 'cashback' in kind or 'interest' in kind:
                    label = "reward"
                elif 'deposit' in kind or 'withdrawal' in kind:
                    label = "transfer"
                else:
                    label = "other"
                
                if kind in ['crypto_purchase', 'buy']:
                    fiat_amount = usd_amount if usd_amount > 0 else to_amount
                    fiat_currency = native_currency if usd_amount > 0 else (to_currency if to_amount > 0 else 'USD')
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=fiat_amount,
                        Sent_Currency=fiat_currency,
                        Received_Amount=amount,
                        Received_Currency=currency,
                        Fee_Amount=0,
                        Fee_Currency="",
                        Description="Crypto.com purchase",
                        Label=label
                    )
                
                elif kind in ['crypto_sell', 'sell']:
                    fiat_amount = usd_amount if usd_amount > 0 else to_amount
                    fiat_currency = native_currency if usd_amount > 0 else (to_currency if to_amount > 0 else 'USD')
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=amount,
                        Sent_Currency=currency,
                        Received_Amount=fiat_amount,
                        Received_Currency=fiat_currency,
                        Fee_Amount=0,
                        Fee_Currency="",
                        Description="Crypto.com sell",
                        Label=label
                    )
                
                elif kind in ['crypto_exchange', 'crypto_swap', 'dust_conversion']:
                    if to_amount <= 0:
                        continue
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=amount,
                        Sent_Currency=currency,
                        Received_Amount=to_amount,
                        Received_Currency=to_currency,
                        Fee_Amount=0,
                        Fee_Currency="",
                        Description=f"Crypto.com {kind.replace('_', ' ')}",
                        Label="swap"
                    )
                
                elif kind in ['crypto_deposit', 'deposit']:
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=0,
                        Sent_Currency="",
                        Received_Amount=amount,
                        Received_Currency=currency,
                        Fee_Amount=0,
                        Fee_Currency="",
                        Description="Crypto.com deposit",
                        Label="deposit"
                    )
                
                elif kind in ['crypto_withdrawal', 'withdrawal']:
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=amount,
                        Sent_Currency=currency,
                        Received_Amount=0,
                        Received_Currency="",
                        Fee_Amount=0,
                        Fee_Currency="",
                        Description="Crypto.com withdrawal",
                        Label="withdrawal"
                    )
                
                elif kind in ['crypto_earn_interest_paid', 'referral_card_cashback', 'rewards_platform_deposit_credited',
                             'reimbursement', 'referral_bonus', 'supercharger_reward_to_app_credited']:
                    if amount <= 0:
                        continue
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=0,
                        Sent_Currency="",
                        Received_Amount=amount,
                        Received_Currency=currency,
                        Fee_Amount=0,
                        Fee_Currency="",
                        Description=f"Crypto.com {kind.replace('_', ' ')}",
                        Label="reward"
                    )
                
                elif kind in ['lockup_lock', 'lockup_unlock', 'crypto_earn_program_created', 'crypto_earn_program_withdrawn',
                             'crypto_withdrawal_fee', 'fee']:
                    continue
                
                else:
                    logger.debug(f"Row {idx}: Unknown Crypto.com kind: {kind}")
                    continue
                
                records.append(record.to_dict())
                
            except Exception as e:
                errors.append(ParseError(
                    row=idx,
                    message=f"Crypto.com: {str(e)}",
                    severity=ErrorSeverity.ERROR,
                    data=safe_row_data(row),
                    suggestion="Export from: Crypto.com App → Accounts → Transaction History → Export"
                ))
        
        return records, errors


class GeminiParser(BaseExchangeParser):
    """Parse Gemini CSV exports (supports multi-currency columns)."""
    
    exchange_name = "Gemini"
    
    COLUMN_MAPPING = {
        'date': 'date',
        'time': 'time',
        'type': 'type',
        'symbol': 'symbol',
        'trading_fee__usd_': 'trading_fee',
        'usd_amount': 'usd_amount',
        'fee__usd_': 'fee',
    }
    
    def get_required_columns(self) -> List[str]:
        return ['date', 'type']
    
    def _find_crypto_amount_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        """Find all crypto amount columns (BTC Amount, ETH Amount, etc.)."""
        crypto_columns = {}
        for col in df.columns:
            col_lower = col.lower()
            if 'amount' in col_lower and col_lower not in ['usd_amount', 'usd amount']:
                symbol = col_lower.replace('_amount', '').replace(' amount', '').upper()
                if symbol and symbol != 'USD':
                    crypto_columns[symbol] = col_lower.replace(' ', '_')
        return crypto_columns
    
    def parse(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Transform Gemini CSV to universal schema."""
        df = self.normalize_columns(df)
        
        # Add defaults
        for col,default in [('time',''), ('symbol',''), ('trading_fee',0.0), ('fee',0.0), ('usd_amount',0.0)]:
            if col not in df.columns:
                df[col] = default
        
        crypto_columns = self._find_crypto_amount_columns(df)
        logger.debug(f"Gemini crypto columns: {crypto_columns}")
        
        records = []
        errors = []
        
        for row in df.itertuples(index=True, name='Row'):
            idx = row.Index
            try:
                date_str = str(row.date).strip()
                if hasattr(row, 'time') and row.time:
                    date_str += f" {row.time}"
                date = format_date(date_str, strict=self.strict_validation)
                if not date:
                    raise ValueError("Invalid date")
                
                tx_type = str(row.type).upper().strip()
                symbol = str(getattr(row, 'symbol', '')).upper().strip()
                
                usd_amount = parse_float(getattr(row, 'usd_amount', 0), non_negative=False)
                trading_fee = abs(parse_float(getattr(row, 'trading_fee', 0)))
                fee = abs(parse_float(getattr(row, 'fee', 0)))
                total_fee = trading_fee + fee
                
                # Determine label
                if tx_type in ['BUY', 'SELL']:
                    label = "trade"
                elif tx_type in ['CREDIT', 'DEPOSIT', 'DEBIT', 'WITHDRAWAL']:
                    label = "transfer"
                else:
                    label = "other"
                
                if tx_type == 'BUY':
                    if 'USD' in symbol:
                        crypto_symbol = symbol.replace('USD', '')
                    elif 'GUSD' in symbol:
                        crypto_symbol = symbol.replace('GUSD', '')
                    else:
                        crypto_symbol = None
                        for crypto, col in crypto_columns.items():
                            amt = parse_float(getattr(row, col, 0), non_negative=False)
                            if amt != 0:
                                crypto_symbol = crypto
                                break
                    
                    if not crypto_symbol:
                        raise ValueError(f"Cannot determine crypto from: {symbol}")
                    
                    crypto_col = crypto_columns.get(crypto_symbol)
                    if not crypto_col:
                        raise ValueError(f"No amount column for {crypto_symbol}")
                    
                    crypto_amount = abs(parse_float(getattr(row, crypto_col, 0), non_negative=False))
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=abs(usd_amount) + total_fee,
                        Sent_Currency='USD',
                        Received_Amount=crypto_amount,
                        Received_Currency=crypto_symbol,
                        Fee_Amount=total_fee,
                        Fee_Currency='USD',
                        Description="Gemini buy",
                        Label=label
                    )
                
                elif tx_type == 'SELL':
                    if 'USD' in symbol:
                        crypto_symbol = symbol.replace('USD', '')
                    elif 'GUSD' in symbol:
                        crypto_symbol = symbol.replace('GUSD', '')
                    else:
                        crypto_symbol = None
                        for crypto, col in crypto_columns.items():
                            amt = parse_float(getattr(row, col, 0), non_negative=False)
                            if amt != 0:
                                crypto_symbol = crypto
                                break
                    
                    if not crypto_symbol:
                        raise ValueError(f"Cannot determine crypto from: {symbol}")
                    
                    crypto_col = crypto_columns.get(crypto_symbol)
                    if not crypto_col:
                        raise ValueError(f"No amount column for {crypto_symbol}")
                    
                    crypto_amount = abs(parse_float(getattr(row, crypto_col, 0), non_negative=False))
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=crypto_amount,
                        Sent_Currency=crypto_symbol,
                        Received_Amount=abs(usd_amount) - total_fee,
                        Received_Currency='USD',
                        Fee_Amount=total_fee,
                        Fee_Currency='USD',
                        Description="Gemini sell",
                        Label=label
                    )
                
                elif tx_type in ['CREDIT', 'DEPOSIT']:
                    if usd_amount > 0:
                        record = UniversalRecord(
                            Date=date,
                            Sent_Amount=0,
                            Sent_Currency="",
                            Received_Amount=abs(usd_amount),
                            Received_Currency='USD',
                            Fee_Amount=0,
                            Fee_Currency="",
                            Description="Gemini deposit",
                            Label=label
                        )
                    else:
                        crypto_symbol, crypto_amount = None, 0
                        for crypto, col in crypto_columns.items():
                            amt = parse_float(getattr(row, col, 0), non_negative=False)
                            if amt > 0:
                                crypto_symbol = crypto
                                crypto_amount = abs(amt)
                                break
                        
                        if not crypto_symbol:
                            raise ValueError("No positive amount found")
                        
                        record = UniversalRecord(
                            Date=date,
                            Sent_Amount=0,
                            Sent_Currency="",
                            Received_Amount=crypto_amount,
                            Received_Currency=crypto_symbol,
                            Fee_Amount=0,
                            Fee_Currency="",
                            Description="Gemini deposit",
                            Label=label
                        )
                
                elif tx_type in ['DEBIT', 'WITHDRAWAL']:
                    if usd_amount < 0:
                        record = UniversalRecord(
                            Date=date,
                            Sent_Amount=abs(usd_amount) + total_fee,
                            Sent_Currency='USD',
                            Received_Amount=0,
                            Received_Currency="",
                            Fee_Amount=total_fee,
                            Fee_Currency='USD',
                            Description="Gemini withdrawal",
                            Label=label
                        )
                    else:
                        crypto_symbol, crypto_amount = None, 0
                        for crypto, col in crypto_columns.items():
                            amt = parse_float(getattr(row, col, 0), non_negative=False)
                            if amt < 0:
                                crypto_symbol = crypto
                                crypto_amount = abs(amt)
                                break
                        
                        if not crypto_symbol:
                            raise ValueError("No negative amount found")
                        
                        record = UniversalRecord(
                            Date=date,
                            Sent_Amount=crypto_amount + total_fee,
                            Sent_Currency=crypto_symbol,
                            Received_Amount=0,
                            Received_Currency="",
                            Fee_Amount=total_fee,
                            Fee_Currency=crypto_symbol if total_fee > 0 else "",
                            Description="Gemini withdrawal",
                            Label=label
                        )
                
                elif tx_type in ['INTEREST EARNED', 'STAKING REWARD', 'EARN CREDIT']:
                    crypto_symbol, crypto_amount = None, 0
                    for crypto, col in crypto_columns.items():
                        amt = parse_float(getattr(row, col, 0), non_negative=False)
                        if amt > 0:
                            crypto_symbol = crypto
                            crypto_amount = abs(amt)
                            break
                    
                    if not crypto_symbol:
                        raise ValueError("No positive amount found")
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=0,
                        Sent_Currency="",
                        Received_Amount=crypto_amount,
                        Received_Currency=crypto_symbol,
                        Fee_Amount=0,
                        Fee_Currency="",
                        Description=f"Gemini {tx_type.lower()}",
                        Label="reward"
                    )
                
                else:
                    logger.debug(f"Row {idx}: Unknown Gemini type: {tx_type}")
                    continue
                
                records.append(record.to_dict())
                
            except Exception as e:
                errors.append(ParseError(
                    row=idx,
                    message=f"Gemini: {str(e)}",
                    severity=ErrorSeverity.ERROR,
                    data=safe_row_data(row),
                    suggestion="Export from: Gemini → Account → Transaction History → Export"
                ))
        
        return records, errors


# ============================================================================
# TIER 4: ADVANCED/RECOVERY PARSERS (3)
# ============================================================================

class FTXParser(BaseExchangeParser):
    """
    Parse FTX CSV exports (pre-bankruptcy trades + claim exports).
    
    Helps users file accurate bankruptcy claims and calculate tax losses.
    """
    
    exchange_name = "FTX"
    
    COLUMN_MAPPING = {
        'date': 'date',
        'time': 'date',
        'market': 'market',
        'type': 'type',
        'side': 'side',
        'price': 'price',
        'size': 'size',
        'amount': 'amount',
        'fee': 'fee',
        'total': 'total',
        'coin': 'currency',
        'notes': 'notes',
    }
    
    def get_required_columns(self) -> List[str]:
        return []  # Accept both formats
    
    def validate(self, df: pd.DataFrame) -> List[str]:
        """Validate either pre-bankruptcy or claim format."""
        df = self.normalize_columns(df)
        columns = [col.lower() for col in df.columns]
        
        has_pre = 'market' in columns or ('date' in columns and 'type' in columns)
        has_claim = 'coin' in columns or ('time' in columns and 'size' in columns)
        
        if not has_pre and not has_claim:
            return [
                "FTX: Unrecognized format. Expected either:\n"
                "- Trading: Date, Market, Type, Price, Size\n"
                "- Claim: Time, Coin, Size, Notes"
            ]
        
        return []
    
    def parse(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Transform FTX CSV to universal schema."""
        df = self.normalize_columns(df)
        
        is_claim = 'coin' in df.columns or ('size' in df.columns and 'market' not in df.columns)
        
        if is_claim:
            return self._parse_bankruptcy_claims(df)
        else:
            return self._parse_trades(df)
    
    def _parse_trades(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Parse FTX pre-bankruptcy trades."""
        if 'fee' not in df.columns:
            df['fee'] = 0.0
        if 'total' not in df.columns:
            df['total'] = 0.0
        
        records, errors = [], []
        
        for row in df.itertuples(index=True, name='Row'):
            idx = row.Index
            try:
                date = format_date(row.date, strict=self.strict_validation)
                if not date:
                    raise ValueError("Invalid date")
                
                market = str(row.market).upper().strip()
                
                if 'PERP' in market or 'MOVE' in market or '-' in market:
                    continue
                
                if '/' in market:
                    base_curr, quote_curr = market.split('/')
                else:
                    base_curr, quote_curr = extract_currency_pair(market)
                
                side = str(getattr(row, 'side', getattr(row, 'type', ''))).upper().strip()
                
                if side not in ['BUY', 'SELL']:
                    continue
                
                size = parse_float(getattr(row, 'size', 0))
                price = parse_float(getattr(row, 'price', 0))
                fee = parse_float(getattr(row, 'fee', 0))
                total = parse_float(getattr(row, 'total', 0))
                
                if total == 0 and size > 0 and price > 0:
                    total = size * price
                
                if size <= 0 or price <= 0:
                    raise ValueError(f"Invalid size/price: {size}/{price}")
                
                if side == 'BUY':
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=total + fee,
                        Sent_Currency=quote_curr,
                        Received_Amount=size,
                        Received_Currency=base_curr,
                        Fee_Amount=fee,
                        Fee_Currency=quote_curr,
                        Description="FTX buy (pre-bankruptcy)",
                        Label="trade"
                    )
                else:
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=size,
                        Sent_Currency=base_curr,
                        Received_Amount=total - fee,
                        Received_Currency=quote_curr,
                        Fee_Amount=fee,
                        Fee_Currency=quote_curr,
                        Description="FTX sell (pre-bankruptcy)",
                        Label="trade"
                    )
                
                records.append(record.to_dict())
                
            except Exception as e:
                errors.append(ParseError(
                    row=idx,
                    message=f"FTX trade: {str(e)}",
                    severity=ErrorSeverity.ERROR,
                    data=safe_row_data(row),
                    suggestion="Use pre-bankruptcy FTX exports for accurate tax loss calculation"
                ))
        
        return records, errors
    
    def _parse_bankruptcy_claims(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Parse FTX bankruptcy claim exports."""
        records, errors = [], []
        
        for row in df.itertuples(index=True, name='Row'):
            idx = row.Index
            try:
                date_col = getattr(row, 'date', None) or getattr(row, 'time', None)
                if not date_col:
                    raise ValueError("No date column")
                
                date = format_date(date_col, strict=self.strict_validation)
                if not date:
                    raise ValueError("Invalid date")
                
                currency = str(getattr(row, 'currency', '') or getattr(row, 'coin', '')).upper().strip()
                size = parse_float(getattr(row, 'size', 0) or getattr(row, 'amount', 0))
                notes = str(getattr(row, 'notes', '')).lower().strip()
                
                if size <= 0:
                    continue
                
                if 'deposit' in notes or 'credit' in notes:
                    label = "deposit"
                elif 'withdrawal' in notes or 'debit' in notes:
                    label = "withdrawal"
                else:
                    label = "balance"
                
                record = UniversalRecord(
                    Date=date,
                    Sent_Amount=0 if 'deposit' in notes else size,
                    Sent_Currency="" if 'deposit' in notes else currency,
                    Received_Amount=size if 'deposit' in notes else 0,
                    Received_Currency=currency if 'deposit' in notes else "",
                    Fee_Amount=0,
                    Fee_Currency="",
                    Description=f"FTX {notes} (claim record)",
                    Label=label
                )
                
                records.append(record.to_dict())
                
            except Exception as e:
                errors.append(ParseError(
                    row=idx,
                    message=f"FTX claim: {str(e)}",
                    severity=ErrorSeverity.ERROR,
                    data=safe_row_data(row),
                    suggestion="FTX bankruptcy claims: Use for loss calculation and claim filing"
                ))
        
        return records, errors


class BitfinexParser(BaseExchangeParser):
    """Parse Bitfinex CSV exports."""
    
    exchange_name = "Bitfinex"
    
    COLUMN_MAPPING = {
        'currency': 'currency',
        'pair': 'pair',
        'amount': 'amount',
        'balance': 'balance',
        'description': 'description',
        'date': 'date',
        'fee': 'fee',
        'price': 'price',
        'type': 'type',
    }
    
    def get_required_columns(self) -> List[str]:
        return ['date', 'amount']
    
    def parse(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Transform Bitfinex CSV to universal schema."""
        df = self.normalize_columns(df)
        
        for col,default in [('currency',''), ('pair',''), ('description',''), ('fee',0.0), ('type','')]:
            if col not in df.columns:
                df[col] = default
        
        records, errors = [], []
        
        for row in df.itertuples(index=True, name='Row'):
            idx = row.Index
            try:
                date = format_date(row.date, strict=self.strict_validation)
                if not date:
                    raise ValueError("Invalid date")
                
                amount = parse_float(row.amount, non_negative=False)
                if amount == 0:
                    continue
                
                currency = str(getattr(row, 'currency', '')).upper().strip()
                pair = str(getattr(row, 'pair', '')).upper().strip()
                
                if pair and pair.startswith('T'):
                    pair = pair[1:]
                
                fee = abs(parse_float(getattr(row, 'fee', 0)))
                
                label = "trade" if pair else ("deposit" if amount > 0 else "withdrawal")
                
                if pair:
                    base_curr, quote_curr = extract_currency_pair(pair)
                    price = parse_float(getattr(row, 'price', 0))
                    
                    if price == 0:
                        continue
                    
                    if amount > 0:
                        total_cost = abs(amount) * price
                        record = UniversalRecord(
                            Date=date,
                            Sent_Amount=total_cost + fee,
                            Sent_Currency=quote_curr,
                            Received_Amount=abs(amount),
                            Received_Currency=base_curr,
                            Fee_Amount=fee,
                            Fee_Currency=quote_curr,
                            Description="Bitfinex buy",
                            Label=label
                        )
                    else:
                        total_received = abs(amount) * price
                        record = UniversalRecord(
                            Date=date,
                            Sent_Amount=abs(amount),
                            Sent_Currency=base_curr,
                            Received_Amount=total_received - fee,
                            Received_Currency=quote_curr,
                            Fee_Amount=fee,
                            Fee_Currency=quote_curr,
                            Description="Bitfinex sell",
                            Label=label
                        )
                
                elif amount > 0:
                    if not currency:
                        raise ValueError("Deposit missing currency")
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=0,
                        Sent_Currency="",
                        Received_Amount=abs(amount),
                        Received_Currency=currency,
                        Fee_Amount=0,
                        Fee_Currency="",
                        Description="Bitfinex deposit",
                        Label=label
                    )
                
                else:
                    if not currency:
                        raise ValueError("Withdrawal missing currency")
                    
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=abs(amount) + fee,
                        Sent_Currency=currency,
                        Received_Amount=0,
                        Received_Currency="",
                        Fee_Amount=fee,
                        Fee_Currency=currency,
                        Description="Bitfinex withdrawal",
                        Label=label
                    )
                
                records.append(record.to_dict())
                
            except Exception as e:
                errors.append(ParseError(
                    row=idx,
                    message=f"Bitfinex: {str(e)}",
                    severity=ErrorSeverity.ERROR,
                    data=safe_row_data(row),
                    suggestion="Export from: Bitfinex → Reports → Export CSV"
                ))
        
        return records, errors


class OKXParser(BaseExchangeParser):
    """Parse OKX (formerly OKEx) CSV exports."""
    
    exchange_name = "OKX"
    
    COLUMN_MAPPING = {
        'time': 'date',
        'order_id': 'order_id',
        'instrument': 'pair',
        'instrument_id': 'pair',
        'type': 'type',
        'side': 'side',
        'fill_price': 'price',
        'avg_fill_price': 'price',
        'price': 'price',
        'fill_size': 'amount',
        'filled_size': 'amount',
        'size': 'amount',
        'fee': 'fee',
        'fee_currency': 'fee_currency',
        'order_state': 'status',
        'state': 'status',
    }
    
    def get_required_columns(self) -> List[str]:
        return ['time', 'side', 'instrument']
    
    def parse(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Transform OKX CSV to universal schema."""
        df = self.normalize_columns(df)
        
        for col,default in [('fee',0.0), ('fee_currency',''), ('status','filled'), ('type','')]:
            if col not in df.columns:
                df[col] = default
        
        records, errors = [], []
        
        for row in df.itertuples(index=True, name='Row'):
            idx = row.Index
            try:
                status = str(getattr(row, 'status', 'filled')).lower().strip()
                if status in ['cancelled', 'canceled', 'pending']:
                    continue
                
                date = format_date(row.date, strict=self.strict_validation)
                if not date:
                    raise ValueError("Invalid date")
                
                pair = str(row.pair).upper().strip()
                if '-' in pair:
                    parts = pair.split('-')
                    base_curr, quote_curr = parts[0], parts[1]
                else:
                    base_curr, quote_curr = extract_currency_pair(pair)
                
                side = str(row.side).upper().strip()
                if side not in ['BUY', 'SELL']:
                    raise ValueError(f"Unknown side: {side}")
                
                amount = parse_float(row.amount)
                price = parse_float(row.price)
                fee = parse_float(getattr(row, 'fee', 0))
                fee_currency = str(getattr(row, 'fee_currency', '')).upper().strip() or quote_curr
                
                if amount <= 0 or price <= 0:
                    raise ValueError(f"Invalid amount/price: {amount}/{price}")
                
                total = amount * price
                
                if side == 'BUY':
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=total + (fee if fee_currency == quote_curr else 0),
                        Sent_Currency=quote_curr,
                        Received_Amount=amount - (fee if fee_currency == base_curr else 0),
                        Received_Currency=base_curr,
                        Fee_Amount=fee,
                        Fee_Currency=fee_currency,
                        Description="OKX buy",
                        Label="trade"
                    )
                else:
                    record = UniversalRecord(
                        Date=date,
                        Sent_Amount=amount,
                        Sent_Currency=base_curr,
                        Received_Amount=total - (fee if fee_currency == quote_curr else 0),
                        Received_Currency=quote_curr,
                        Fee_Amount=fee,
                        Fee_Currency=fee_currency,
                        Description="OKX sell",
                        Label="trade"
                    )
                
                records.append(record.to_dict())
                
            except Exception as e:
                errors.append(ParseError(
                    row=idx,
                    message=f"OKX: {str(e)}",
                    severity=ErrorSeverity.ERROR,
                    data=safe_row_data(row),
                    suggestion="Export from: OKX → Assets → Bills → Export"
                ))
        
        return records, errors


# ============================================================================
# GENERIC FALLBACK PARSER
# ============================================================================

class GenericCSVParser(BaseExchangeParser):
    """
    Generic CSV parser for files that don't match known exchange formats.

    Attempts to map common column names to standard transaction fields.
    This is a best-effort parser that can handle many crypto CSV formats.
    """

    exchange_name = "Generic"

    # Map of common column names to standard fields
    # Each standard field has a list of possible column names (case-insensitive)
    COLUMN_VARIATIONS = {
        'date': [
            'date', 'time', 'timestamp', 'datetime', 'created', 'created_at',
            'transaction date', 'transaction_date', 'trade date', 'trade_date',
            'execution time', 'execution_time', 'activity date', 'activity_date',
            'date(utc)', 'date_utc', 'utc date', 'utc_date'
        ],
        'type': [
            'type', 'transaction type', 'transaction_type', 'trade type', 'trade_type',
            'side', 'action', 'direction', 'operation', 'trans_type', 'trans type',
            'activity type', 'activity_type', 'kind', 'category'
        ],
        'amount': [
            'amount', 'quantity', 'qty', 'size', 'volume', 'units',
            'quantity transacted', 'quantity_transacted', 'trade amount', 'trade_amount',
            'crypto amount', 'crypto_amount', 'coin amount', 'coin_amount',
            'asset amount', 'asset_amount', 'executed', 'filled'
        ],
        'currency': [
            'currency', 'asset', 'coin', 'token', 'symbol', 'crypto',
            'base currency', 'base_currency', 'crypto currency', 'crypto_currency',
            'asset type', 'asset_type', 'ticker'
        ],
        'price': [
            'price', 'rate', 'unit price', 'unit_price', 'spot price', 'spot_price',
            'execution price', 'execution_price', 'fill price', 'fill_price',
            'price per unit', 'price_per_unit', 'avg price', 'avg_price'
        ],
        'total': [
            'total', 'value', 'subtotal', 'gross', 'net', 'cost',
            'usd amount', 'usd_amount', 'fiat amount', 'fiat_amount',
            'total value', 'total_value', 'notional', 'proceeds'
        ],
        'fee': [
            'fee', 'fees', 'commission', 'trading fee', 'trading_fee',
            'transaction fee', 'transaction_fee', 'fee amount', 'fee_amount',
            'cost', 'charges'
        ],
        'pair': [
            'pair', 'market', 'trading pair', 'trading_pair', 'trade pair', 'trade_pair',
            'symbol', 'instrument', 'product', 'contract'
        ],
    }

    def get_required_columns(self) -> List[str]:
        """Generic parser has no strict requirements - it's best-effort."""
        return []

    def _find_column(self, df: pd.DataFrame, field: str) -> Optional[str]:
        """Find a column matching any of the variations for a field."""
        variations = self.COLUMN_VARIATIONS.get(field, [])
        columns_lower = {col.lower().strip(): col for col in df.columns}

        for var in variations:
            if var in columns_lower:
                return columns_lower[var]
        return None

    def _map_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        """Map DataFrame columns to standard field names."""
        mapping = {}
        for field in self.COLUMN_VARIATIONS.keys():
            col = self._find_column(df, field)
            if col:
                mapping[field] = col
        return mapping

    def parse(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[ParseError]]:
        """Parse CSV with best-effort column mapping."""
        records: List[Dict[str, Any]] = []
        errors: List[ParseError] = []

        # Find column mappings
        mapping = self._map_columns(df)
        logger.info(f"Generic parser mapped columns: {mapping}")

        # We need at least date and either amount or total
        if 'date' not in mapping:
            errors.append(ParseError(
                row=0,
                message="Could not find a date column. Expected columns like: date, timestamp, time, created_at",
                severity=ErrorSeverity.CRITICAL,
                suggestion="Ensure your CSV has a date/timestamp column"
            ))
            return [], errors

        if 'amount' not in mapping and 'total' not in mapping:
            errors.append(ParseError(
                row=0,
                message="Could not find an amount column. Expected columns like: amount, quantity, size, total",
                severity=ErrorSeverity.CRITICAL,
                suggestion="Ensure your CSV has an amount or quantity column"
            ))
            return [], errors

        for idx, row in df.iterrows():
            try:
                # Parse date
                date_col = mapping['date']
                date_str = str(row[date_col]).strip()
                date = parse_date_flexible(date_str)
                if not date:
                    errors.append(ParseError(
                        row=idx,
                        message=f"Could not parse date: {date_str}",
                        severity=ErrorSeverity.WARNING,
                        data=safe_row_data(row)
                    ))
                    continue

                # Parse type (default to "Trade" if not found)
                tx_type = "Trade"
                if 'type' in mapping:
                    tx_type = str(row[mapping['type']]).strip() or "Trade"

                # Parse amount
                amount = 0.0
                if 'amount' in mapping:
                    amount = float(safe_decimal(row[mapping['amount']]))

                # Parse currency
                currency = "UNKNOWN"
                if 'currency' in mapping:
                    currency = str(row[mapping['currency']]).strip().upper() or "UNKNOWN"
                elif 'pair' in mapping:
                    # Try to extract currency from pair (e.g., BTC/USD -> BTC)
                    pair = str(row[mapping['pair']]).strip()
                    if '/' in pair:
                        currency = pair.split('/')[0].strip().upper()
                    elif '-' in pair:
                        currency = pair.split('-')[0].strip().upper()

                # Parse price
                price = 0.0
                if 'price' in mapping:
                    price = float(safe_decimal(row[mapping['price']]))

                # Parse total
                total = 0.0
                if 'total' in mapping:
                    total = abs(float(safe_decimal(row[mapping['total']])))
                elif amount != 0 and price != 0:
                    total = abs(amount * price)

                # Parse fee
                fee = 0.0
                if 'fee' in mapping:
                    fee = abs(float(safe_decimal(row[mapping['fee']])))

                # Skip rows with zero amount and zero total
                if amount == 0 and total == 0:
                    continue

                # Build record using UniversalRecord format
                record = UniversalRecord(
                    Date=date,
                    Sent_Amount=amount if tx_type.lower() in ['sell', 'send', 'withdrawal', 'withdraw'] else 0.0,
                    Sent_Currency=currency if tx_type.lower() in ['sell', 'send', 'withdrawal', 'withdraw'] else '',
                    Received_Amount=amount if tx_type.lower() in ['buy', 'receive', 'deposit'] else 0.0,
                    Received_Currency=currency if tx_type.lower() in ['buy', 'receive', 'deposit'] else '',
                    Fee_Amount=fee,
                    Fee_Currency="USD",
                    Description=f"Generic: {tx_type} {currency}",
                    Label="trade" if tx_type.lower() in ['trade', 'buy', 'sell', 'swap'] else "other"
                )

                # For unknown types, default to received
                if record.Sent_Amount == 0 and record.Received_Amount == 0:
                    record.Received_Amount = amount
                    record.Received_Currency = currency

                records.append(record.to_dict())

            except Exception as e:
                errors.append(ParseError(
                    row=idx,
                    message=f"Generic parser error: {str(e)}",
                    severity=ErrorSeverity.ERROR,
                    data=safe_row_data(row),
                    suggestion="Check that your CSV has valid data in each row"
                ))

        if not records:
            errors.append(ParseError(
                row=0,
                message="No valid transactions could be extracted from the file",
                severity=ErrorSeverity.CRITICAL,
                suggestion="Verify your CSV format and ensure it contains transaction data"
            ))

        return records, errors


# ============================================================================
# PARSER REGISTRY
# ============================================================================

class ParserRegistry:
    """Auto-detect and route to appropriate exchange parser."""
    
    def __init__(self):
        self.parsers = {
            # Tier 1: Enterprise
            "binance": BinanceParser(),
            "coinbase": CoinbaseParser(),
            "kraken": KrakenParser(),
            "kucoin": KuCoinParser(),
            "bybit": BybitParser(),
            # Tier 2: Beginner
            "cashapp": CashAppParser(),
            "robinhood": RobinhoodParser(),
            "paypal": PayPalParser(),
            "venmo": VenmoParser(),
            # Tier 3: Power Users
            "crypto.com": CryptoDotComParser(),
            "gemini": GeminiParser(),
            # Tier 4: Advanced
            "ftx": FTXParser(),
            "bitfinex": BitfinexParser(),
            "okx": OKXParser(),
            # Generic fallback
            "generic": GenericCSVParser(),
        }
    
    def detect_exchange(self, df: pd.DataFrame) -> Optional[str]:
        """
        Detect which exchange based on column headers.

        Uses centralized detection from fingerprinting.py to avoid duplicate logic.
        """
        # Use centralized detection from fingerprinting module
        if FINGERPRINTING_AVAILABLE:
            result = detect_exchange_from_headers(df)
            if result and result != "Unknown":
                # Normalize to lowercase for parser lookup
                # Handle special cases like "Cash App" -> "cashapp", "Crypto.com" -> "crypto.com"
                normalized = result.lower().replace(" ", "").replace(".", "")
                # Map normalized names to parser keys
                name_map = {
                    "cashapp": "cashapp",
                    "cryptocom": "crypto.com",
                }
                return name_map.get(normalized, result.lower())

        # Fallback: inline detection if fingerprinting not available
        columns_lower = [col.lower() for col in df.columns]
        columns_joined = " ".join(columns_lower)

        # FTX detection
        if "market" in columns_lower and any(col in columns_lower for col in ["size", "price"]):
            if 'market' in df.columns:
                markets_sample = df['market'].astype(str).head(5)
                if any('/' in str(m) or 'PERP' in str(m) for m in markets_sample):
                    return "ftx"

        # Bitfinex detection
        if "#" in columns_lower or df.columns[0] == '#':
            return "bitfinex"

        # OKX detection
        if "instrument" in columns_lower or "instrument_id" in columns_lower:
            return "okx"

        # Coinbase detection
        if "transaction type" in columns_joined and "asset" in columns_lower:
            if "timestamp" in columns_lower or "quantity transacted" in columns_joined:
                return "coinbase"
        if "type" in columns_lower and "currency" in columns_lower and "timestamp" in columns_lower:
            return "coinbase"

        # Robinhood detection
        if "activity date" in columns_joined and "token" in columns_lower:
            return "robinhood"

        # Binance detection
        if any(col in columns_lower for col in ["pair", "side"]) and "date(utc)" in columns_joined:
            return "binance"

        # Kraken detection
        if "txid" in columns_lower or "refid" in columns_lower:
            return "kraken"

        return None
    
    def get_parser(self, exchange: str) -> Optional[BaseExchangeParser]:
        """Get parser instance for given exchange."""
        return self.parsers.get(exchange.lower())
    
    def list_supported_exchanges(self) -> List[str]:
        """List all supported exchanges."""
        return list(self.parsers.keys())


# ============================================================================
# FINGERPRINTING & CACHING HELPERS
# ============================================================================

def get_or_create_config(df: pd.DataFrame, parser_name: str) -> Optional[Dict[str, str]]:
    """
    Get or create a configuration using fingerprinting.
    
    This enables config caching:
    1. Generate fingerprint of CSV headers
    2. Check database for existing config
    3. If found: Return cached mapping (instant recognition!)
    4. If not found: Return None (UI should ask user to map)
    5. On save: increment_usage_count() tracks popularity
    
    Args:
        df: DataFrame with CSV data
        parser_name: Parser type (e.g., "Coinbase", "Binance")
        
    Returns:
        Cached mapping_config dict if found, None otherwise
    """
    if not FINGERPRINTING_AVAILABLE:
        return None
    
    try:
        fingerprint = generate_fingerprint(df)
        if not fingerprint:
            logger.warning("Could not generate fingerprint")
            return None
        
        config = get_config_by_hash(fingerprint)
        
        if config:
            logger.info(f"Config found for {parser_name}: {fingerprint}")
            increment_usage_count(fingerprint)
            return config.mapping_config
        else:
            logger.info(f"No config found for {parser_name}: {fingerprint}")
            logger.info("User will be asked to map columns")
            return None
            
    except Exception as e:
        logger.error(f"Error in fingerprinting: {e}")
        return None

# ============================================================================
# MAIN API FUNCTIONS
# ============================================================================

def load_csv_to_df(csv_content: bytes) -> Tuple[Optional[pd.DataFrame], Dict[str, Any]]:
    """
    Load CSV bytes into DataFrame with auto-detected encoding, delimiter, and start row.
    """
    if len(csv_content) > MAX_FILE_SIZE:
        return None, {
            "error": f"File too large: {len(csv_content)} bytes (max {MAX_FILE_SIZE})",
            "encoding": None,
            "rows": 0,
        }
    
    encoding = detect_encoding(csv_content)
    
    try:
        text = csv_content.decode(encoding, errors="replace")
    except LookupError:
        text = csv_content.decode("utf-8", errors="replace")
    
    delimiter = detect_delimiter(text)

    # Smart header detection - find actual header row by looking for header keywords
    # This handles CSVs with metadata rows before headers (e.g., Coinbase)
    lines = text.split('\n')[:30]
    header_row = 0

    # Common header keywords across exchanges
    HEADER_KEYWORDS = [
        'timestamp', 'date', 'time', 'created',  # Date columns
        'type', 'transaction', 'side', 'action',  # Transaction type columns
        'amount', 'quantity', 'size', 'volume',   # Amount columns
        'asset', 'currency', 'coin', 'symbol', 'pair',  # Asset columns
        'price', 'rate', 'fee', 'total', 'subtotal',  # Price/fee columns
        'txid', 'refid', 'order', 'id',  # ID columns
    ]

    for i, line in enumerate(lines):
        if not line.strip():
            continue

        lower = line.lower()
        cols = len(line.split(delimiter))

        # Must have at least 3 columns and contain header keywords
        if cols >= 3:
            keyword_matches = sum(1 for kw in HEADER_KEYWORDS if kw in lower)
            # If we find 2+ header keywords, this is likely the header row
            if keyword_matches >= 2:
                header_row = i
                break

    # Fallback: if no keywords found, use row with most columns
    if header_row == 0:
        max_cols = 0
        for i, line in enumerate(lines):
            if not line.strip():
                continue
            cols = len(line.split(delimiter))
            if cols > max_cols:
                max_cols = cols
                header_row = i

    try:
        # Use skiprows to skip metadata rows, header will be first row after skip
        df = pd.read_csv(
            io.StringIO(text),
            delimiter=delimiter,
            skiprows=header_row,
            on_bad_lines='skip',
            nrows=MAX_ROWS
        )
    except Exception as e:
        return None, {
            "error": f"Failed to parse CSV: {str(e)}",
            "encoding": encoding,
            "rows": 0,
        }
    
    original_columns = list(df.columns)
    
    meta = {
        "encoding": encoding,
        "delimiter": delimiter,
        "original_columns": original_columns,
        "rows": len(df),
        "error": None,
    }
    
    return df, meta

def process_file(
    input_data: Union[bytes, pd.DataFrame],
    exchange_name: Optional[str] = None,
    debug: bool = False,
    max_errors: int = MAX_ERRORS_IN_RESPONSE,
    deduplicate: bool = True,
    progress_callback: Optional[Callable[[int, int], None]] = None,
) -> Dict[str, Any]:
    """
    Main entry point: Load CSV, Detect Exchange, Transform Data.
    
    NEW FEATURES:
    - Enhanced error messages with recovery suggestions
    - Price anomaly detection
    - Transaction categorization (labels)
    - Progress tracking
    """
    warnings = []

    try:
        # Normalize input
        if isinstance(input_data, pd.DataFrame):
            df = input_data
            meta = {
                "encoding": "utf-8",
                "delimiter": ",",
                "original_columns": list(df.columns),
                "rows": len(df),
                "error": None,
            }
        else:
            df, meta = load_csv_to_df(input_data)

        if df is None or df.empty:
            error_msg = meta.get("error", "CSV file is empty")
            return {
                "success": False,
                "records": [],
                "errors": [{"message": error_msg, "severity": "critical"}],
                "warnings": warnings,
                "meta": meta,
                "exchange": None,
            }

        registry = ParserRegistry()

        # Auto-detect exchange
        if not exchange_name:
            exchange_name = registry.detect_exchange(df)

        if not exchange_name:
            # Build a more helpful error message with column analysis
            columns_found = list(df.columns)
            columns_lower = [str(c).lower() for c in columns_found]

            # Check which common fields are present
            has_date = any(kw in ' '.join(columns_lower) for kw in ['date', 'time', 'timestamp', 'created'])
            has_amount = any(kw in ' '.join(columns_lower) for kw in ['amount', 'quantity', 'size', 'volume'])
            has_type = any(kw in ' '.join(columns_lower) for kw in ['type', 'side', 'action', 'transaction'])

            # Build suggestion based on what's present
            suggestion_parts = []
            if not has_date:
                suggestion_parts.append("No date/timestamp column found")
            if not has_amount:
                suggestion_parts.append("No amount/quantity column found")
            if not has_type:
                suggestion_parts.append("No transaction type column found")

            if suggestion_parts:
                detailed_suggestion = f"Issues detected: {'; '.join(suggestion_parts)}. "
            else:
                detailed_suggestion = "Your file has basic columns but doesn't match any known exchange format. "

            detailed_suggestion += "Select your exchange manually from the dropdown, or try 'Generic CSV' if your file has common column names."

            return {
                "success": False,
                "records": [],
                "errors": [{
                    "message": "Could not auto-detect exchange format",
                    "severity": "critical",
                    "columns_found": columns_found,
                    "column_count": len(columns_found),
                    "supported_exchanges": registry.list_supported_exchanges(),
                    "suggestion": detailed_suggestion,
                    "analysis": {
                        "has_date_column": has_date,
                        "has_amount_column": has_amount,
                        "has_type_column": has_type,
                    }
                }],
                "warnings": warnings,
                "meta": meta,
                "exchange": None,
            }

        parser = registry.get_parser(exchange_name)
        if not parser:
            return {
                "success": False,
                "records": [],
                "errors": [{
                    "message": f"No parser available for {exchange_name}",
                    "severity": "critical",
                    "supported_exchanges": registry.list_supported_exchanges(),
                }],
                "warnings": warnings,
                "meta": meta,
                "exchange": exchange_name,
            }

        # Validate schema
        validation_errors = parser.validate(df)
        if validation_errors:
            return {
                "success": False,
                "records": [],
                "errors": [{"message": err, "severity": "critical"} for err in validation_errors],
                "warnings": warnings,
                "meta": meta,
                "exchange": exchange_name,
            }

        # Parse data
        records, parse_errors = parser.parse(df)

        if not records:
            error_msg = "No valid transactions could be parsed from CSV"
            if parse_errors:
                error_msg += f" ({len(parse_errors)} rows had errors)"

            return {
                "success": False,
                "records": [],
                "errors": [{"message": error_msg, "severity": "critical"}] + [
                    err.to_dict() for err in parse_errors[:max_errors]
                ],
                "warnings": warnings,
                "meta": meta,
                "exchange": exchange_name,
            }

        # Deduplicate
        if deduplicate and records:
            original_count = len(records)
            df_records = pd.DataFrame(records)
            df_records = df_records.drop_duplicates(
                subset=['Date', 'Sent Amount', 'Sent Currency', 'Received Amount', 'Received Currency']
            )
            records = df_records.to_dict('records')

            duplicates_removed = original_count - len(records)
            if duplicates_removed > 0:
                warnings.append(f"✓ Removed {duplicates_removed} duplicate transactions")

        # Progress callback
        if progress_callback:
            progress_callback(len(records), len(df))

        # Warnings
        if parse_errors:
            warnings.append(f"⚠️ {len(parse_errors)} rows had parsing errors (check details below)")

        if len(records) < len(df):
            skipped = len(df) - len(records)
            warnings.append(f"ℹ️ {skipped} rows were skipped (non-crypto transactions, pending, or duplicates)")

        # SUCCESS - Add helpful summary
        warnings.append(f"✓ Successfully parsed {len(records)} transactions from {exchange_name}")

        # Generate fingerprint
        fingerprint = ""
        if FINGERPRINTING_AVAILABLE:
            try:
                fingerprint = generate_fingerprint(df)
                logger.debug(f"Generated fingerprint: {fingerprint}")
            except Exception as e:
                logger.debug(f"Could not generate fingerprint: {e}")

        return {
            "success": True,
            "records": records,
            "errors": [err.to_dict() for err in parse_errors[:max_errors]],
            "warnings": warnings,
            "meta": {
                **meta,
                "rows_parsed": len(records),
                "rows_skipped": len(df) - len(records),
                "rows_with_errors": len(parse_errors),
                "total_errors": len(parse_errors),
                "errors_shown": min(len(parse_errors), max_errors),
                "exchange_detected": exchange_name,
                "fingerprint": fingerprint,
                "parser_version": __version__,
            },
            "exchange": exchange_name,
        }

    except Exception as e:
        logger.exception("Engine processing failure")
        return {
            "success": False,
            "records": [],
            "errors": [{"message": str(e), "code": "CRITICAL_ERROR", "severity": "critical"}],
            "warnings": warnings,
            "meta": {},
            "exchange": None,
        }