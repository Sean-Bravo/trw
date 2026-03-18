"""
Tests for services/api_auth.py — API key validation, rate limiting, usage tracking.
"""

import hashlib
import time
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

import pytest

# Patch all external deps before importing api_auth
import sys
sys.modules["boto3"] = MagicMock()
mock_psycopg2 = MagicMock()
sys.modules["psycopg2"] = mock_psycopg2
sys.modules["psycopg2.extras"] = MagicMock()
sys.modules["psycopg2.pool"] = MagicMock()
sys.modules["pandas"] = MagicMock()
sys.modules["numpy"] = MagicMock()
sys.modules["chardet"] = MagicMock()

import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.api_auth import (
    validate_key,
    check_rate_limit,
    check_monthly_quota,
    increment_usage,
    record_request,
    _rpm_tracker,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clear_rpm_tracker():
    """Clear the in-memory RPM tracker between tests."""
    _rpm_tracker.clear()
    yield
    _rpm_tracker.clear()


@pytest.fixture
def mock_db():
    """Mock the get_db function to return a mock connection."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
    mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
    with patch("services.api_auth.get_db", return_value=mock_conn):
        yield mock_conn, mock_cursor


# ---------------------------------------------------------------------------
# validate_key
# ---------------------------------------------------------------------------

class TestValidateKey:
    def test_returns_none_for_empty_key(self, mock_db):
        assert validate_key("") is None
        assert validate_key(None) is None

    def test_returns_none_for_bad_prefix(self, mock_db):
        assert validate_key("invalid_prefix_abc123") is None

    def test_returns_none_when_no_db_match(self, mock_db):
        _, mock_cursor = mock_db
        mock_cursor.fetchone.return_value = None
        assert validate_key("tf_live_abc123def456") is None

    def test_returns_none_for_expired_key(self, mock_db):
        _, mock_cursor = mock_db
        expired = datetime.now(timezone.utc) - timedelta(days=1)
        mock_cursor.fetchone.return_value = {
            "id": "key-1",
            "is_active": True,
            "expires_at": expired,
        }
        assert validate_key("tf_live_abc123def456") is None

    def test_returns_key_record_for_valid_key(self, mock_db):
        mock_conn, mock_cursor = mock_db
        key_record = {
            "id": "key-1",
            "user_id": "user-1",
            "name": "Test",
            "tier": "free",
            "is_active": True,
            "rate_limit_rpm": 10,
            "monthly_quota": 10,
            "last_used_at": None,
            "expires_at": None,
            "created_at": datetime.now(timezone.utc),
        }
        mock_cursor.fetchone.return_value = key_record
        result = validate_key("tf_live_abc123def456")
        assert result is not None
        assert result["id"] == "key-1"
        assert result["tier"] == "free"

    def test_hashes_key_with_sha256(self, mock_db):
        _, mock_cursor = mock_db
        mock_cursor.fetchone.return_value = None
        test_key = "tf_live_test123"
        validate_key(test_key)
        # Check that the SQL query used the correct hash
        call_args = mock_cursor.execute.call_args
        expected_hash = hashlib.sha256(test_key.encode()).hexdigest()
        assert expected_hash in str(call_args)


# ---------------------------------------------------------------------------
# check_rate_limit
# ---------------------------------------------------------------------------

class TestCheckRateLimit:
    def test_allows_first_request(self):
        allowed, count = check_rate_limit("key-1", 10)
        assert allowed is True
        assert count == 1

    def test_allows_requests_under_limit(self):
        for _ in range(5):
            check_rate_limit("key-1", 10)
        allowed, count = check_rate_limit("key-1", 10)
        assert allowed is True
        assert count == 6

    def test_blocks_at_limit(self):
        for _ in range(10):
            check_rate_limit("key-1", 10)
        allowed, count = check_rate_limit("key-1", 10)
        assert allowed is False
        assert count == 10

    def test_cleans_old_entries(self):
        _rpm_tracker["key-1"] = [time.time() - 120, time.time() - 90]  # 2+ min ago
        allowed, count = check_rate_limit("key-1", 10)
        assert allowed is True
        assert count == 1  # Old entries cleaned, only new one counted

    def test_isolates_keys(self):
        for _ in range(10):
            check_rate_limit("key-1", 10)
        # key-2 should not be affected
        allowed, count = check_rate_limit("key-2", 10)
        assert allowed is True
        assert count == 1


# ---------------------------------------------------------------------------
# check_monthly_quota
# ---------------------------------------------------------------------------

class TestCheckMonthlyQuota:
    def test_under_quota(self, mock_db):
        _, mock_cursor = mock_db
        mock_cursor.fetchone.return_value = {"total": 5}
        allowed, usage, is_overage = check_monthly_quota("key-1", 10)
        assert allowed is True
        assert usage == 5
        assert is_overage is False

    def test_at_quota_flags_overage(self, mock_db):
        _, mock_cursor = mock_db
        mock_cursor.fetchone.return_value = {"total": 10}
        allowed, usage, is_overage = check_monthly_quota("key-1", 10)
        assert allowed is True  # Never hard-blocks
        assert usage == 10
        assert is_overage is True

    def test_handles_zero_usage(self, mock_db):
        _, mock_cursor = mock_db
        mock_cursor.fetchone.return_value = {"total": 0}
        allowed, usage, is_overage = check_monthly_quota("key-1", 10)
        assert allowed is True
        assert usage == 0
        assert is_overage is False


# ---------------------------------------------------------------------------
# increment_usage
# ---------------------------------------------------------------------------

class TestIncrementUsage:
    def test_executes_upsert(self, mock_db):
        mock_conn, mock_cursor = mock_db
        increment_usage("key-1", 5000)
        mock_cursor.execute.assert_called_once()
        sql = mock_cursor.execute.call_args[0][0]
        assert "INSERT INTO api_usage" in sql
        assert "ON CONFLICT" in sql
        mock_conn.commit.assert_called_once()

    def test_passes_file_size(self, mock_db):
        _, mock_cursor = mock_db
        increment_usage("key-1", 12345)
        params = mock_cursor.execute.call_args[0][1]
        assert params[0] == "key-1"
        assert params[1] == 12345  # file_size in INSERT
        assert params[2] == 12345  # file_size in UPDATE

    def test_db_error_does_not_raise(self, mock_db):
        mock_conn, mock_cursor = mock_db
        mock_cursor.execute.side_effect = Exception("DB error")
        # Should not raise
        increment_usage("key-1", 0)
        mock_conn.rollback.assert_called_once()


# ---------------------------------------------------------------------------
# record_request
# ---------------------------------------------------------------------------

class TestRecordRequest:
    def test_inserts_all_fields(self, mock_db):
        mock_conn, mock_cursor = mock_db
        record_request(
            key_id="key-1",
            endpoint="/v1/parse",
            method="POST",
            status_code=200,
            response_time_ms=150,
            error_code=None,
            file_size=5000,
            source_type="crypto_exchange",
            detected_source="coinbase",
            transaction_count=42,
            ip_address="1.2.3.4",
        )
        mock_cursor.execute.assert_called_once()
        params = mock_cursor.execute.call_args[0][1]
        assert params[0] == "key-1"
        assert params[1] == "/v1/parse"
        assert params[3] == 200
        assert params[9] == 42  # transaction_count
        mock_conn.commit.assert_called_once()

    def test_handles_none_fields(self, mock_db):
        mock_conn, mock_cursor = mock_db
        record_request(
            key_id="key-1",
            endpoint="/v1/usage",
            method="GET",
            status_code=200,
        )
        params = mock_cursor.execute.call_args[0][1]
        assert params[4] == 0  # response_time_ms default
        assert params[5] is None  # error_code
        assert params[6] is None  # file_size

    def test_db_error_does_not_raise(self, mock_db):
        mock_conn, mock_cursor = mock_db
        mock_cursor.execute.side_effect = Exception("DB error")
        # Should not raise
        record_request(key_id="key-1", endpoint="/v1/parse", method="POST", status_code=500)
        mock_conn.rollback.assert_called_once()
