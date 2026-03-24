"""Type definitions for TaxFormatter API responses."""

from typing import Any, Dict, List, Optional
try:
    from typing import TypedDict
except ImportError:
    from typing_extensions import TypedDict


class Metadata(TypedDict, total=False):
    transaction_count: int
    processing_time_ms: int
    api_version: str


class ParseResponse(TypedDict, total=False):
    status: str
    summary: str
    detected_source: str
    source_type: str
    output_format: str
    transactions: List[Dict[str, Any]]
    warnings: List[str]
    metadata: Metadata
    code: str
    message: str
    suggestion: str


class SourceInfo(TypedDict):
    id: str
    name: str


class OutputFormats(TypedDict):
    crypto: List[str]
    bank: List[str]


class SourcesResponse(TypedDict):
    crypto_exchanges: List[SourceInfo]
    banks: List[SourceInfo]
    output_formats: OutputFormats


class MonthUsage(TypedDict):
    file_count: int
    request_count: int


class KeyUsage(TypedDict):
    key_id: str
    key_name: str
    tier: str
    monthly_quota: int
    current_month: MonthUsage


class UsageResponse(TypedDict):
    usage: List[KeyUsage]


class HealthResponse(TypedDict):
    status: str
    version: str
    environment: str
