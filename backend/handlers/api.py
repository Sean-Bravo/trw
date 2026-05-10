"""
API Lambda Handler — Developer API entry point
Handles: /v1/parse (crypto + bank), /v1/sources, /v1/usage, /v1/health

All routes require X-API-Key header (except /v1/health and /v1/sources).
"""

import base64
import json
import logging
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Dict, Optional

# H-9: see backend/services/safe_errors.py — sanitizes error messages
# before they're returned to API clients.
_services_path = os.path.join(os.path.dirname(__file__), "services")
if not os.path.exists(_services_path):
    _services_path = os.path.join(os.path.dirname(__file__), "..", "services")
if _services_path not in sys.path:
    sys.path.insert(0, _services_path)
from safe_errors import safe_error_message  # noqa: E402

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENVIRONMENT = os.environ.get("ENVIRONMENT", "prod")

# API version
API_VERSION = "2026-03-01"


### H-11: CORS allowlist
#
# The previous wildcard `Access-Control-Allow-Origin: *` paired with
# Authorization in Allow-Headers was a recurring footgun: if anyone ever
# enables Allow-Credentials, the wildcard turns into full credentialed
# CSRF on every API call. The fix is to echo back only allowlisted
# origins, fall back to the canonical origin otherwise, and Vary on
# Origin so caches don't poison cross-origin responses.
ALLOWED_ORIGINS = {
    "https://taxformatter.com",
    "https://www.taxformatter.com",
    "https://app.taxformatter.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
}
DEFAULT_ORIGIN = "https://taxformatter.com"

# Per-invocation request origin. Lambda runs one event per process at a
# time within a single warm container, so this is safe.
_current_request_origin: Optional[str] = None


def _set_request_origin(event: Dict) -> None:
    global _current_request_origin
    headers = event.get("headers") or {}
    # API Gateway lowercases header names.
    _current_request_origin = headers.get("origin") or headers.get("Origin")


def _allowed_origin() -> str:
    if _current_request_origin and _current_request_origin in ALLOWED_ORIGINS:
        return _current_request_origin
    return DEFAULT_ORIGIN


def response(status_code: int, body: Any, headers: Optional[Dict] = None) -> Dict:
    """Generate API Gateway response."""
    default_headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": _allowed_origin(),
        "Access-Control-Allow-Headers": "Content-Type,X-API-Key",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Vary": "Origin",
        "X-Api-Version": API_VERSION,
    }
    if headers:
        default_headers.update(headers)

    return {
        "statusCode": status_code,
        "headers": default_headers,
        "body": json.dumps(body, default=str),
    }


def error_response(
    status_code: int,
    code: str,
    message: str,
    suggestion: str = "",
    extra: Optional[Dict] = None,
    headers: Optional[Dict] = None,
) -> Dict:
    """Generate a structured error response."""
    body = {
        "status": "error",
        "code": code,
        "message": message,
    }
    if suggestion:
        body["suggestion"] = suggestion
    if extra:
        body.update(extra)
    body.setdefault("metadata", {})["api_version"] = API_VERSION
    return response(status_code, body, headers)


def _app_url() -> str:
    """
    Public app URL for upgrade_url in error responses.
    Sourced from APP_URL env var (set in Terraform). Fallback exists only
    for misconfigured Lambdas; in normal operation APP_URL is always set.
    """
    url = os.environ.get("APP_URL")
    if not url:
        logger.warning("APP_URL env var not set; falling back to https://taxformatter.com")
        return "https://taxformatter.com"
    return url


def _seconds_until_month_rollover() -> int:
    """Seconds from now until 00:00:00 UTC on the 1st of next month."""
    now = datetime.now(timezone.utc)
    if now.month == 12:
        next_first = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        next_first = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
    return int((next_first - now).total_seconds())


def _next_month_first_iso() -> str:
    """ISO 8601 timestamp for 00:00:00 UTC on the 1st of next month."""
    now = datetime.now(timezone.utc)
    if now.month == 12:
        next_first = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        next_first = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
    return next_first.isoformat()


def get_api_key(event: Dict) -> Optional[str]:
    """Extract API key from request headers."""
    headers = event.get("headers", {})
    # API Gateway lowercases all headers
    api_key = headers.get("x-api-key", "")
    if not api_key:
        # Also check Authorization: Bearer header
        auth = headers.get("authorization", "")
        if auth.startswith("Bearer "):
            api_key = auth[7:]
    return api_key if api_key else None


def get_client_ip(event: Dict) -> str:
    """Extract client IP from request."""
    return event.get("requestContext", {}).get("http", {}).get("sourceIp", "unknown")


# =============================================================================
# /v1/parse — Unified parse endpoint (crypto CSV + bank PDF)
# =============================================================================

def handle_v1_parse(event: Dict, key_record: Dict, request_id: str = "") -> Dict:
    """
    Parse a crypto CSV or bank statement PDF.
    Detects file type automatically based on filename extension.
    """
    start_time = time.time()

    # Conversion-tracking substrate (Phase 0.5): one-line emit per request so
    # free→paid conversion is measurable from CloudWatch Logs Insights.
    logger.info(
        "api_request",
        extra={
            "tier": key_record.get("tier"),
            "key_id": key_record["id"],
            "endpoint": "/v1/parse",
            "request_id": request_id,
        },
    )

    # Parse request body
    try:
        body = json.loads(event.get("body", "{}"))
    except (json.JSONDecodeError, TypeError):
        return error_response(400, "invalid_request", "Request body must be valid JSON.")

    file_content_b64 = body.get("file_content", "")
    filename = body.get("filename", "")

    if not file_content_b64 or not filename:
        return error_response(
            400, "invalid_request",
            "Both 'file_content' (base64) and 'filename' are required.",
        )

    # Filename length check
    if len(filename) > 255:
        return error_response(
            400, "invalid_request",
            "Filename must be 255 characters or fewer.",
        )

    # Log unknown top-level keys (forward compatibility — don't reject)
    known_keys = {"file_content", "filename", "output_format", "exchange", "source_type"}
    unknown_keys = set(body.keys()) - known_keys
    if unknown_keys:
        logger.info(f"Unknown request keys (ignored): {unknown_keys}")

    # Decode base64
    try:
        file_bytes = base64.b64decode(file_content_b64)
    except Exception:
        return error_response(400, "invalid_file", "Could not decode file_content. Must be valid base64.")

    file_size = len(file_bytes)

    # Check file size (10MB limit for API — base64 inflates ~33%)
    max_size = 10 * 1024 * 1024
    if file_size > max_size:
        return error_response(
            400, "file_too_large",
            f"File exceeds {max_size // (1024*1024)}MB limit ({file_size // (1024*1024)}MB provided).",
            suggestion="Split the file into smaller parts.",
        )

    if file_size == 0:
        return error_response(400, "file_empty", "File is empty.")

    # Detect file type
    filename_lower = filename.lower()
    is_pdf = filename_lower.endswith(".pdf")
    is_csv = filename_lower.endswith(".csv") or filename_lower.endswith(".xlsx")

    if not is_pdf and not is_csv:
        return error_response(
            400, "invalid_file_type",
            "Only PDF and CSV/XLSX files are supported.",
            suggestion="Rename your file with the correct extension, or check /v1/sources for supported formats.",
        )

    # Import and track usage
    from services.api_auth import check_monthly_quota, increment_usage, record_request

    # Quota check (Phase 2): hard-block free at limit, soft-flag paid for headers.
    # Run before processing to avoid wasting compute on quota-exceeded free users.
    tier = key_record.get("tier", "starter")
    allowed, usage, is_overage = check_monthly_quota(
        key_record["id"], key_record["monthly_quota"], tier
    )
    if not allowed:
        return error_response(
            429,
            "quota_exceeded",
            "Free tier monthly limit of 25 files reached. Resets on the 1st. Upgrade for higher limits.",
            extra={"upgrade_url": f"{_app_url()}/pricing"},
            headers={
                "Retry-After": str(_seconds_until_month_rollover()),
                "X-Quota-Reset": _next_month_first_iso(),
                "X-Api-Usage": str(usage),
                "X-Api-Quota": str(key_record["monthly_quota"]),
            },
        )

    # Bank-PDF feature gate (Phase 2): free tier excluded from PDF parsing.
    if is_pdf and tier == "free":
        return error_response(
            403,
            "feature_not_available",
            "Bank PDF parsing requires Growth tier or higher.",
            extra={"upgrade_url": f"{_app_url()}/pricing"},
        )

    if is_csv:
        result = _parse_crypto(file_bytes, body, filename)
    else:
        result = _parse_bank(file_bytes, body, filename)

    processing_time_ms = int((time.time() - start_time) * 1000)

    # Determine status code and source info
    status_code = 200 if result.get("status") == "success" else 422
    if result.get("code") in ("internal_error",):
        status_code = 500

    # Add metadata
    if "metadata" not in result:
        result["metadata"] = {}
    result["metadata"]["processing_time_ms"] = processing_time_ms
    result["metadata"]["api_version"] = API_VERSION

    # Track usage on success
    if status_code == 200:
        increment_usage(key_record["id"], file_size)

    # Log request
    record_request(
        key_id=key_record["id"],
        endpoint="/v1/parse",
        method="POST",
        status_code=status_code,
        response_time_ms=processing_time_ms,
        error_code=result.get("code"),
        file_size=file_size,
        source_type=result.get("source_type"),
        detected_source=result.get("detected_source"),
        transaction_count=result.get("metadata", {}).get("transaction_count"),
        ip_address=get_client_ip(event),
        request_id=request_id,
        tier=key_record.get("tier"),
    )

    # Add processing time and overage headers (paid soft-flag — free is hard-blocked above)
    extra_headers = {
        "X-TF-Processing-Time": str(processing_time_ms),
    }
    if is_overage:
        extra_headers["X-Api-Overage"] = "true"
        extra_headers["X-Api-Usage"] = str(usage)
        extra_headers["X-Api-Quota"] = str(key_record["monthly_quota"])

    return response(status_code, result, extra_headers)


def _parse_crypto(file_bytes: bytes, body: Dict, filename: str) -> Dict:
    """Parse a crypto exchange CSV."""
    exchange = body.get("exchange")  # Optional — auto-detect if omitted
    output_format = body.get("output_format", "koinly")

    valid_formats = ("koinly", "turbotax", "coinledger", "zenledger")
    if output_format not in valid_formats:
        return {
            "status": "error",
            "code": "invalid_format",
            "message": f"Invalid output_format. Must be one of: {', '.join(valid_formats)}",
        }

    try:
        # Import engine
        try:
            from services.engine import process_file
        except ImportError:
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from services.engine import process_file

        result = process_file(file_bytes, exchange_name=exchange)

        if not result.get("success"):
            errors = result.get("errors", [])
            first_error = errors[0] if errors else {}
            error_msg = first_error.get("message", "Parse failed")

            # Map to structured error code
            if "auto-detect" in error_msg.lower() or "exchange" in error_msg.lower():
                code = "unsupported_exchange"
                suggestion = "Specify the 'exchange' parameter, or check /v1/sources for supported exchanges."
            else:
                code = "parse_error"
                suggestion = "Check that the file is valid and not corrupted."

            return {
                "status": "error",
                "code": code,
                "message": error_msg,
                "suggestion": suggestion,
                "source_type": "crypto_exchange",
            }

        records = result.get("records", [])
        exchange_detected = result.get("exchange", "unknown")

        # Convert format if needed
        if output_format != "koinly" and records:
            try:
                try:
                    from services.format_converter import convert_records
                except ImportError:
                    from format_converter import convert_records

                records, convert_warnings = convert_records(records, output_format)
            except Exception as e:
                logger.exception("Format conversion failed")
                return {
                    "status": "error",
                    "code": "parse_error",
                    "message": f"Parsed successfully but format conversion to {output_format} failed: {safe_error_message(e)}",
                    "source_type": "crypto_exchange",
                }

        # Build summary
        meta = result.get("meta", {})
        count = len(records)
        summary = f"Parsed {count} {exchange_detected} transaction{'s' if count != 1 else ''}"
        if meta.get("rows_skipped"):
            summary += f" ({meta['rows_skipped']} rows skipped)"

        return {
            "status": "success",
            "summary": summary,
            "detected_source": exchange_detected,
            "source_type": "crypto_exchange",
            "output_format": output_format,
            "transactions": records,
            "warnings": result.get("warnings", []),
            "metadata": {
                "transaction_count": count,
                "rows_total": meta.get("rows", 0),
                "rows_parsed": meta.get("rows_parsed", count),
                "rows_skipped": meta.get("rows_skipped", 0),
                "exchange_detected": exchange_detected,
            },
        }

    except Exception as e:
        logger.exception("Crypto parse error")
        return {
            "status": "error",
            "code": "internal_error",
            "message": "An internal error occurred while parsing the file.",
            "detail": safe_error_message(e),
            "source_type": "crypto_exchange",
        }


def _parse_bank(file_bytes: bytes, body: Dict, filename: str) -> Dict:
    """Parse a bank statement PDF."""
    bank = body.get("bank")  # Optional — auto-detect if omitted

    try:
        try:
            from services.bank_statement import BankStatementProcessor
        except ImportError:
            from bank_statement import BankStatementProcessor

        processor = BankStatementProcessor()
        result = processor.process(BytesIO(file_bytes))

        if not result.get("success", False):
            error_msg = result.get("error", "Failed to parse bank statement")
            return {
                "status": "error",
                "code": "unsupported_bank",
                "message": error_msg,
                "suggestion": "Check /v1/sources for supported banks, or contact support to request a new parser.",
                "source_type": "bank_statement",
            }

        transactions = result.get("transactions", [])
        detected_bank = result.get("bank", "unknown")
        count = len(transactions)

        summary = f"Parsed {count} transaction{'s' if count != 1 else ''} from {detected_bank}"

        return {
            "status": "success",
            "summary": summary,
            "detected_source": detected_bank,
            "source_type": "bank_statement",
            "transactions": transactions,
            "warnings": result.get("warnings", []),
            "metadata": {
                "transaction_count": count,
                "detected_bank": detected_bank,
                "statement_period": result.get("period", ""),
                "account_number_last4": result.get("account_last4", ""),
            },
        }

    except Exception as e:
        logger.exception("Bank parse error")
        return {
            "status": "error",
            "code": "internal_error",
            "message": "An internal error occurred while parsing the file.",
            "detail": safe_error_message(e),
            "source_type": "bank_statement",
        }


# =============================================================================
# /v1/sources — List supported sources
# =============================================================================

def handle_v1_sources(event: Dict) -> Dict:
    """List all supported crypto exchanges and banks."""
    try:
        # Get exchanges from engine
        try:
            from services.engine import ParserRegistry
        except ImportError:
            from engine import ParserRegistry

        registry = ParserRegistry()
        exchanges = registry.list_supported_exchanges()

        # Get banks from config files
        banks = []
        try:
            try:
                from services.bank_statement.fingerprinter import BankFingerprinter
            except ImportError:
                from bank_statement.fingerprinter import BankFingerprinter

            fingerprinter = BankFingerprinter()
            for bank_config in fingerprinter.configs:
                banks.append({
                    "id": bank_config.get("id", ""),
                    "name": bank_config.get("name", ""),
                })
        except Exception as e:
            logger.warning(f"Could not load bank configs: {e}")

        return response(200, {
            "crypto_exchanges": [{"id": ex, "name": ex} for ex in exchanges],
            "banks": banks,
            "output_formats": {
                "crypto": ["koinly", "turbotax", "coinledger", "zenledger"],
                "bank": ["csv"],
            },
        })

    except Exception as e:
        logger.exception("Failed to list sources")
        return response(500, {"status": "error", "code": "internal_error", "message": "Internal error", "detail": safe_error_message(e)})


# =============================================================================
# /v1/usage — Get usage for current API key
# =============================================================================

def handle_v1_usage(event: Dict, key_record: Dict) -> Dict:
    """Return usage stats for the authenticated API key."""
    from services.api_auth import get_db

    conn = get_db()
    with conn.cursor() as cur:
        # Current month usage
        cur.execute(
            """SELECT COALESCE(SUM(request_count), 0)::int as request_count,
                      COALESCE(SUM(file_count), 0)::int as file_count,
                      COALESCE(SUM(bytes_processed), 0)::bigint as bytes_processed
               FROM api_usage
               WHERE api_key_id = %s
                 AND usage_date >= date_trunc('month', CURRENT_DATE)""",
            (key_record["id"],),
        )
        current = cur.fetchone()

        # Daily breakdown for current month
        cur.execute(
            """SELECT usage_date, request_count, file_count, bytes_processed
               FROM api_usage
               WHERE api_key_id = %s
                 AND usage_date >= date_trunc('month', CURRENT_DATE)
               ORDER BY usage_date""",
            (key_record["id"],),
        )
        daily = cur.fetchall()

    return response(200, {
        "tier": key_record["tier"],
        "monthly_quota": key_record["monthly_quota"],
        "rate_limit_rpm": key_record["rate_limit_rpm"],
        "current_month": {
            "request_count": current["request_count"],
            "file_count": current["file_count"],
            "bytes_processed": current["bytes_processed"],
        },
        "daily": [dict(row) for row in daily],
    })


# =============================================================================
# /v1/health — Health check (no auth)
# =============================================================================

def handle_v1_health(event: Dict) -> Dict:
    """Health check endpoint."""
    return response(200, {
        "status": "ok",
        "version": API_VERSION,
        "environment": ENVIRONMENT,
    })


# =============================================================================
# Main handler
# =============================================================================

def handler(event: Dict, context: Any) -> Dict:
    """Main Lambda handler — routes /v1/* requests."""
    request_id = str(uuid.uuid4())
    _set_request_origin(event)  # H-11

    # Handle CORS preflight
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return response(200, {}, {"X-Request-Id": request_id})

    route_key = event.get("routeKey", "")
    logger.info(f"API request: {route_key} request_id={request_id}")

    # Routes that don't require auth
    if route_key == "GET /v1/health":
        resp = handle_v1_health(event)
        resp["headers"]["X-Request-Id"] = request_id
        return resp
    if route_key == "GET /v1/sources":
        resp = handle_v1_sources(event)
        resp["headers"]["X-Request-Id"] = request_id
        return resp

    # All other routes require API key auth
    api_key = get_api_key(event)
    if not api_key:
        resp = error_response(
            401, "invalid_api_key",
            "API key is required. Pass it via X-API-Key header or Authorization: Bearer header.",
        )
        resp["headers"]["X-Request-Id"] = request_id
        return resp

    from services.api_auth import validate_key, check_rate_limit, record_request

    key_record = validate_key(api_key)
    if not key_record:
        resp = error_response(
            401, "invalid_api_key",
            "Invalid or revoked API key.",
        )
        resp["headers"]["X-Request-Id"] = request_id
        return resp

    # Rate limit check
    allowed, current_rpm = check_rate_limit(key_record["id"], key_record["rate_limit_rpm"])
    if not allowed:
        resp = error_response(
            429, "rate_limited",
            f"Rate limit exceeded ({key_record['rate_limit_rpm']} requests/minute).",
            suggestion="Wait and retry. Upgrade your tier for higher limits.",
            extra={"metadata": {"retry_after_seconds": 60}},
        )
        resp["headers"]["Retry-After"] = "60"
        resp["headers"]["X-Request-Id"] = request_id
        return resp

    # Route to handler
    if route_key == "POST /v1/parse":
        resp = handle_v1_parse(event, key_record, request_id=request_id)
    elif route_key == "GET /v1/usage":
        resp = handle_v1_usage(event, key_record)
    else:
        logger.warning(f"Unknown API route: {route_key}")
        resp = error_response(404, "not_found", f"Route not found: {route_key}")

    resp["headers"]["X-Request-Id"] = request_id
    return resp
