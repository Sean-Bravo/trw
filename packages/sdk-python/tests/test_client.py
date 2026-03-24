"""Tests for the TaxFormatter Python SDK."""

import json
from unittest.mock import patch, MagicMock
import pytest
from taxformatter import TaxFormatter, TaxFormatterError, AuthenticationError, RateLimitError, ParseError


def mock_response(status_code, body, headers=None):
    """Create a mock requests.Response."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.ok = 200 <= status_code < 300
    resp.json.return_value = body
    resp.headers = headers or {}
    return resp


class TestInit:
    def test_requires_api_key(self):
        with pytest.raises(ValueError, match="API key is required"):
            TaxFormatter("")

    def test_default_options(self):
        tf = TaxFormatter("tf_live_xxx")
        assert tf.base_url == "https://api.taxformatter.com"
        assert tf.timeout == 30
        assert tf.max_retries == 3

    def test_custom_options(self):
        tf = TaxFormatter("tf_live_xxx", base_url="https://custom.api.com", timeout=5, max_retries=1)
        assert tf.base_url == "https://custom.api.com"
        assert tf.timeout == 5
        assert tf.max_retries == 1


class TestParse:
    @patch("taxformatter.client.requests.Session")
    def test_sends_base64(self, MockSession):
        session = MockSession.return_value
        session.request.return_value = mock_response(200, {
            "status": "success",
            "detected_source": "coinbase",
            "transactions": [{"date": "2025-01-01"}],
            "metadata": {"transaction_count": 1},
        })

        tf = TaxFormatter("tf_live_xxx")
        result = tf.parse(b"csv,data", filename="coinbase.csv")

        assert result["status"] == "success"
        assert result["detected_source"] == "coinbase"
        call_args = session.request.call_args
        body = call_args[1]["json"] if "json" in call_args[1] else call_args[0][2] if len(call_args[0]) > 2 else None
        assert body is not None
        assert body["filename"] == "coinbase.csv"

    @patch("taxformatter.client.requests.Session")
    def test_passes_options(self, MockSession):
        session = MockSession.return_value
        session.request.return_value = mock_response(200, {"status": "success"})

        tf = TaxFormatter("tf_live_xxx")
        tf.parse(b"data", filename="file.csv", output_format="turbotax", exchange="binance")

        call_args = session.request.call_args
        body = call_args[1].get("json", {})
        assert body.get("output_format") == "turbotax"
        assert body.get("exchange") == "binance"

    @patch("taxformatter.client.requests.Session")
    def test_requires_filename_for_bytes(self, MockSession):
        tf = TaxFormatter("tf_live_xxx")
        with pytest.raises(ValueError, match="filename is required"):
            tf.parse(b"data")

    @patch("taxformatter.client.requests.Session")
    def test_auth_error(self, MockSession):
        session = MockSession.return_value
        session.request.return_value = mock_response(401, {
            "code": "invalid_api_key",
            "message": "Invalid or revoked API key.",
        })

        tf = TaxFormatter("bad_key")
        with pytest.raises(AuthenticationError):
            tf.parse(b"data", filename="file.csv")

    @patch("taxformatter.client.requests.Session")
    def test_parse_error(self, MockSession):
        session = MockSession.return_value
        session.request.return_value = mock_response(422, {
            "code": "parse_error",
            "message": "Could not detect exchange",
            "suggestion": "Specify the exchange parameter",
        })

        tf = TaxFormatter("tf_live_xxx")
        with pytest.raises(ParseError) as exc_info:
            tf.parse(b"data", filename="file.csv")
        assert exc_info.value.suggestion == "Specify the exchange parameter"

    @patch("taxformatter.client.requests.Session")
    @patch("taxformatter.client.time.sleep")
    def test_retries_on_429(self, mock_sleep, MockSession):
        session = MockSession.return_value
        session.request.side_effect = [
            mock_response(429, {
                "code": "rate_limited",
                "message": "Rate limit exceeded",
            }, {"Retry-After": "1"}),
            mock_response(200, {"status": "success"}),
        ]

        tf = TaxFormatter("tf_live_xxx", max_retries=2)
        result = tf.parse(b"data", filename="file.csv")

        assert result["status"] == "success"
        assert session.request.call_count == 2
        mock_sleep.assert_called_once_with(1)

    @patch("taxformatter.client.requests.Session")
    def test_rate_limit_after_max_retries(self, MockSession):
        session = MockSession.return_value
        session.request.return_value = mock_response(429, {
            "code": "rate_limited",
            "message": "Rate limit exceeded",
            "metadata": {"retry_after_seconds": 60},
        }, {"Retry-After": "0"})

        tf = TaxFormatter("tf_live_xxx", max_retries=1)
        with pytest.raises(RateLimitError) as exc_info:
            tf.parse(b"data", filename="file.csv")
        assert exc_info.value.retry_after == 60

    @patch("taxformatter.client.requests.Session")
    def test_server_error(self, MockSession):
        session = MockSession.return_value
        session.request.return_value = mock_response(500, {
            "code": "internal_error",
            "message": "Internal server error",
        })

        tf = TaxFormatter("tf_live_xxx")
        with pytest.raises(TaxFormatterError) as exc_info:
            tf.parse(b"data", filename="file.csv")
        assert exc_info.value.status_code == 500


class TestListSources:
    @patch("taxformatter.client.requests.Session")
    def test_returns_sources(self, MockSession):
        session = MockSession.return_value
        session.request.return_value = mock_response(200, {
            "crypto_exchanges": [{"id": "coinbase", "name": "Coinbase"}],
            "banks": [{"id": "chase", "name": "Chase"}],
            "output_formats": {"crypto": ["koinly"], "bank": ["csv"]},
        })

        tf = TaxFormatter("tf_live_xxx")
        result = tf.list_sources()
        assert len(result["crypto_exchanges"]) == 1
        assert len(result["banks"]) == 1


class TestGetUsage:
    @patch("taxformatter.client.requests.Session")
    def test_returns_usage(self, MockSession):
        session = MockSession.return_value
        session.request.return_value = mock_response(200, {
            "usage": [{"key_id": "k1", "key_name": "test", "tier": "starter", "monthly_quota": 100, "current_month": {"file_count": 5, "request_count": 10}}],
        })

        tf = TaxFormatter("tf_live_xxx")
        result = tf.get_usage()
        assert len(result["usage"]) == 1
        assert result["usage"][0]["tier"] == "starter"


class TestHealth:
    @patch("taxformatter.client.requests.Session")
    def test_returns_health(self, MockSession):
        session = MockSession.return_value
        session.request.return_value = mock_response(200, {
            "status": "ok",
            "version": "2026-03-01",
            "environment": "prod",
        })

        tf = TaxFormatter("tf_live_xxx")
        result = tf.health()
        assert result["status"] == "ok"


class TestErrors:
    def test_base_error(self):
        err = TaxFormatterError("test", "msg", 400, "suggestion")
        assert err.code == "test"
        assert err.status_code == 400
        assert err.suggestion == "suggestion"
        assert str(err) == "msg"

    def test_auth_error_defaults(self):
        err = AuthenticationError()
        assert err.status_code == 401
        assert err.code == "authentication_error"

    def test_rate_limit_error(self):
        err = RateLimitError("limit", 60)
        assert err.status_code == 429
        assert err.retry_after == 60

    def test_parse_error(self):
        err = ParseError("parse_error", "bad file", "try again")
        assert err.status_code == 422
        assert err.suggestion == "try again"

    def test_error_repr(self):
        err = TaxFormatterError("test", "msg", 400)
        assert "TaxFormatterError" in repr(err)
