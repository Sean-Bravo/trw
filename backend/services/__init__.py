"""
TRW Backend Services
CSV processing engine for crypto tax formatting

Modules:
- fingerprinting: Generate MD5 hashes of CSV headers for format detection
- hasher: Generate hashes for CSV content
- engine: Main CSV processing engine (13 exchanges supported)
- storage: Database operations for exchange config caching (Neon PostgreSQL)
"""

from .fingerprinting import (
    generate_fingerprint,
    detect_exchange_from_headers,
    analyze_csv_format,
    get_supported_exchanges,
)

from .hasher import generate_hash

from .storage import (
    ExchangeConfig,
    ConfigStore,
    get_config_by_hash,
    save_new_config,
    increment_usage_count,
    get_all_configs,
    get_most_used_configs,
    test_connection,
)

__version__ = "3.0.0"
__all__ = [
    # Fingerprinting
    "generate_fingerprint",
    "detect_exchange_from_headers",
    "analyze_csv_format",
    "get_supported_exchanges",
    # Hasher
    "generate_hash",
    # Storage
    "ExchangeConfig",
    "ConfigStore",
    "get_config_by_hash",
    "save_new_config",
    "increment_usage_count",
    "get_all_configs",
    "get_most_used_configs",
    "test_connection",
]
