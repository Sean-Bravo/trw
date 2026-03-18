"""
API Authentication & Usage Tracking
Validates API keys, enforces rate limits, and tracks usage for the developer API.
"""

import hashlib
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# In-memory RPM tracking (resets on cold start — acceptable for MVP)
_rpm_tracker: Dict[str, list] = {}


def _get_db_connection():
    """Get a database connection using DATABASE_URL from Secrets Manager."""
    import boto3

    secrets_arn = os.environ.get("SECRETS_ARN")
    if not secrets_arn:
        raise RuntimeError("SECRETS_ARN not configured")

    client = boto3.client("secretsmanager")
    response = client.get_secret_value(SecretId=secrets_arn)
    secrets = json.loads(response["SecretString"])
    database_url = secrets.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL not found in secrets")

    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)


# Cache DB connection across warm invocations
_db_conn = None


def get_db():
    """Get or create a cached database connection."""
    global _db_conn
    if _db_conn is None or _db_conn.closed:
        _db_conn = _get_db_connection()
    try:
        _db_conn.cursor().execute("SELECT 1")
    except Exception:
        _db_conn = _get_db_connection()
    return _db_conn


def validate_key(api_key: str) -> Optional[Dict[str, Any]]:
    """
    Validate an API key by hashing and looking up in the database.
    Returns the key record if valid, None otherwise.
    """
    if not api_key or not api_key.startswith("tf_live_"):
        return None

    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    conn = get_db()
    with conn.cursor() as cur:
        cur.execute(
            """SELECT id, user_id, name, tier, is_active, rate_limit_rpm, monthly_quota,
                      last_used_at, expires_at, created_at
               FROM api_keys
               WHERE key_hash = %s AND is_active = true""",
            (key_hash,),
        )
        row = cur.fetchone()

    if not row:
        return None

    # Check expiration
    if row.get("expires_at") and row["expires_at"] < datetime.now(timezone.utc):
        return None

    # Update last_used_at (fire and forget)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE api_keys SET last_used_at = now() WHERE id = %s",
                (row["id"],),
            )
        conn.commit()
    except Exception:
        conn.rollback()

    return dict(row)


def check_rate_limit(key_id: str, rpm_limit: int) -> Tuple[bool, int]:
    """
    Check in-memory RPM rate limit.
    Returns (allowed, current_count).
    """
    now = time.time()
    window_start = now - 60

    # Clean old entries
    if key_id in _rpm_tracker:
        _rpm_tracker[key_id] = [t for t in _rpm_tracker[key_id] if t > window_start]
    else:
        _rpm_tracker[key_id] = []

    current_count = len(_rpm_tracker[key_id])
    if current_count >= rpm_limit:
        return False, current_count

    _rpm_tracker[key_id].append(now)
    return True, current_count + 1


def check_monthly_quota(key_id: str, monthly_quota: int) -> Tuple[bool, int, bool]:
    """
    Check monthly file usage against quota.
    Returns (allowed, current_usage, is_overage).
    Never hard-blocks — flags overage instead.
    """
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute(
            """SELECT COALESCE(SUM(file_count), 0)::int as total
               FROM api_usage
               WHERE api_key_id = %s
                 AND usage_date >= date_trunc('month', CURRENT_DATE)""",
            (key_id,),
        )
        row = cur.fetchone()

    current_usage = row["total"] if row else 0
    is_overage = current_usage >= monthly_quota

    # Never hard-block — allow overage, flag it
    return True, current_usage, is_overage


def increment_usage(key_id: str, file_size: int = 0) -> None:
    """Increment daily usage counters for the API key."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO api_usage (api_key_id, usage_date, request_count, file_count, bytes_processed)
                   VALUES (%s, CURRENT_DATE, 1, 1, %s)
                   ON CONFLICT (api_key_id, usage_date)
                   DO UPDATE SET
                     request_count = api_usage.request_count + 1,
                     file_count = api_usage.file_count + 1,
                     bytes_processed = api_usage.bytes_processed + %s""",
                (key_id, file_size, file_size),
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to increment usage: {e}")


def record_request(
    key_id: str,
    endpoint: str,
    method: str,
    status_code: int,
    response_time_ms: int = 0,
    error_code: Optional[str] = None,
    file_size: Optional[int] = None,
    source_type: Optional[str] = None,
    detected_source: Optional[str] = None,
    transaction_count: Optional[int] = None,
    ip_address: Optional[str] = None,
) -> None:
    """Log an API request to the api_requests table."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO api_requests
                   (api_key_id, endpoint, method, status_code, response_time_ms,
                    error_code, file_size, source_type, detected_source,
                    transaction_count, ip_address)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    key_id,
                    endpoint,
                    method,
                    status_code,
                    response_time_ms,
                    error_code,
                    file_size,
                    source_type,
                    detected_source,
                    transaction_count,
                    ip_address,
                ),
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to record API request: {e}")
