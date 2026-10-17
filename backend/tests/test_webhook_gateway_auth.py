"""
Tests for WS1: the webhook Lambda's X-Internal-Token check on every non-/v1
API Gateway route, plus the download hardening that ships with it (format
allowlist, no jobId in Content-Disposition filenames).

Before WS1 every one of these routes was public with no authorizer, so a
direct call to api.taxformatter.com skipped the Next.js ownership checks.
"""

import importlib
import json
import logging
import os
import re
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.modules.setdefault("boto3", MagicMock())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services"))

try:
    from botocore.exceptions import ClientError  # installed in the Lambda package and CI
except ImportError:  # local venv without botocore: the handler only needs the class shape
    import types

    class ClientError(Exception):  # type: ignore[no-redef]
        def __init__(self, error_response, operation_name):
            super().__init__(f"{operation_name}: {error_response['Error']['Code']}")
            self.response = error_response
            self.operation_name = operation_name

    _exc = types.ModuleType("botocore.exceptions")
    _exc.ClientError = ClientError
    _botocore = types.ModuleType("botocore")
    _botocore.exceptions = _exc
    sys.modules.setdefault("botocore", _botocore)
    sys.modules.setdefault("botocore.exceptions", _exc)

from handlers import webhook  # noqa: E402

SECRET = "test-shared-secret-0123456789abcdef"

# Every route the webhook Lambda dispatches, and the handler it reaches.
WEBHOOK_ROUTES = {
    "POST /presigned-url": "handle_presigned_url",
    "POST /confirm-upload": "handle_confirm_upload",
    "GET /job/{jobId}": "handle_job_status",
    "GET /download/{jobId}": "handle_download",
    "GET /insights/{jobId}": "handle_insights",
    "POST /job/{jobId}/retry": "handle_job_retry",
    "DELETE /delete/{jobId}": "handle_delete_job",
    "POST /bank/presigned-url": "handle_bank_presigned_url",
    "POST /bank/process": "handle_bank_process",
    "GET /bank/job/{jobId}": "handle_bank_job_status",
    "GET /bank/job/{jobId}/download": "handle_bank_download",
    "GET /bank/banks": "handle_list_banks",
}

TERRAFORM_API_GATEWAY = os.path.join(os.path.dirname(__file__), "..", "terraform", "api_gateway.tf")


def _event(route_key, headers=None, method=None):
    return {
        "routeKey": route_key,
        "headers": headers if headers is not None else {},
        "requestContext": {"http": {"method": method or route_key.split(" ", 1)[0]}},
        "pathParameters": {"jobId": "job-1"},
    }


def _ok(*_args, **_kwargs):
    return webhook.response(200, {"routed": True})


@pytest.fixture
def stub_handlers():
    """Replace every route handler with a mock so only the auth gate is exercised."""
    mocks = {name: MagicMock(side_effect=_ok) for name in WEBHOOK_ROUTES.values()}
    with patch.multiple(webhook, **mocks):
        yield mocks


def _mode(mode, secret=SECRET):
    return patch.multiple(webhook, GATEWAY_AUTH_MODE=mode, _internal_gateway_token=secret)


def _auth_warnings(caplog):
    out = []
    for rec in caplog.records:
        if rec.levelno != logging.WARNING:
            continue
        try:
            payload = json.loads(rec.getMessage())
        except (ValueError, TypeError):
            continue
        if payload.get("event") == "gateway_auth_failed":
            out.append(payload)
    return out


class TestRouteInventory:

    def test_every_terraform_webhook_route_is_covered_here(self):
        # A route added to the gateway without being listed here would go untested.
        src = open(TERRAFORM_API_GATEWAY).read()
        blocks = re.findall(r'route_key\s*=\s*"([^"]+)"\s*\n\s*target\s*=\s*"([^"]+)"', src)
        webhook_routes = {rk for rk, target in blocks if "integration.webhook." in target}
        assert webhook_routes == set(WEBHOOK_ROUTES)

    def test_placeholder_webhook_route_is_gone(self):
        assert '"POST /webhook"' not in open(TERRAFORM_API_GATEWAY).read()
        with _mode("log"):
            resp = webhook.handler(_event("POST /webhook", {"x-internal-token": SECRET}), None)
        assert resp["statusCode"] == 404


class TestLogMode:

    @pytest.mark.parametrize("route_key", sorted(WEBHOOK_ROUTES))
    def test_missing_token_still_routes_and_logs(self, route_key, stub_handlers, caplog):
        with _mode("log"), caplog.at_level(logging.INFO):
            resp = webhook.handler(_event(route_key), None)

        assert resp["statusCode"] == 200
        stub_handlers[WEBHOOK_ROUTES[route_key]].assert_called_once()
        assert _auth_warnings(caplog) == [
            {"event": "gateway_auth_failed", "route_key": route_key, "reason": "missing", "mode": "log"}
        ]

    def test_wrong_token_routes_and_never_logs_either_token(self, stub_handlers, caplog):
        wrong = "wrong-token-value-should-never-be-logged"
        with _mode("log"), caplog.at_level(logging.INFO):
            resp = webhook.handler(_event("GET /bank/banks", {"x-internal-token": wrong}), None)

        assert resp["statusCode"] == 200
        assert [w["reason"] for w in _auth_warnings(caplog)] == ["mismatch"]
        # The "Received event" info log dumps the headers; the token must be redacted.
        assert wrong not in caplog.text
        assert SECRET not in caplog.text

    def test_valid_token_logs_no_warning(self, stub_handlers, caplog):
        with _mode("log"), caplog.at_level(logging.INFO):
            webhook.handler(_event("GET /bank/banks", {"x-internal-token": SECRET}), None)
        assert _auth_warnings(caplog) == []
        assert SECRET not in caplog.text

    def test_unset_secret_logs_and_routes(self, stub_handlers, caplog):
        with _mode("log", secret=""), patch.object(webhook, "get_secrets", return_value={}), \
                caplog.at_level(logging.WARNING):
            resp = webhook.handler(_event("GET /bank/banks", {"x-internal-token": SECRET}), None)
        assert resp["statusCode"] == 200
        assert [w["reason"] for w in _auth_warnings(caplog)] == ["secret_unset"]


class TestEnforceMode:

    @pytest.mark.parametrize("route_key", sorted(WEBHOOK_ROUTES))
    @pytest.mark.parametrize("headers", [
        {},
        {"x-internal-token": ""},
        {"x-internal-token": "wrong"},
        {"x-internal-token": SECRET + "x"},
        {"x-internal-token": SECRET[:-1]},
        {"x-internal-token": "nön-ascii-tøken"},
    ], ids=["missing", "empty", "wrong", "suffix", "prefix", "non-ascii"])
    def test_missing_or_wrong_token_gets_401_on_every_route(self, route_key, headers, stub_handlers):
        with _mode("enforce"):
            resp = webhook.handler(_event(route_key, headers), None)

        assert resp["statusCode"] == 401
        assert json.loads(resp["body"]) == {"error": "Unauthorized"}
        for mock in stub_handlers.values():
            mock.assert_not_called()

    @pytest.mark.parametrize("route_key", sorted(WEBHOOK_ROUTES))
    def test_valid_token_routes(self, route_key, stub_handlers):
        with _mode("enforce"):
            resp = webhook.handler(_event(route_key, {"x-internal-token": SECRET}), None)
        assert resp["statusCode"] == 200
        stub_handlers[WEBHOOK_ROUTES[route_key]].assert_called_once()

    def test_header_name_is_case_insensitive(self, stub_handlers):
        with _mode("enforce"):
            resp = webhook.handler(_event("GET /bank/banks", {"X-Internal-Token": SECRET}), None)
        assert resp["statusCode"] == 200

    def test_unset_secret_fails_closed(self, stub_handlers):
        # An empty secret must not match an empty or missing header.
        with _mode("enforce", secret=""), patch.object(webhook, "get_secrets", return_value={}):
            for headers in ({}, {"x-internal-token": ""}):
                resp = webhook.handler(_event("GET /bank/banks", headers), None)
                assert resp["statusCode"] == 401
        for mock in stub_handlers.values():
            mock.assert_not_called()

    def test_unrecognised_route_is_401_not_404(self, stub_handlers):
        with _mode("enforce"):
            resp = webhook.handler(_event("GET /something-new"), None)
        assert resp["statusCode"] == 401


class TestExemptions:

    @pytest.mark.parametrize("mode", ["log", "enforce"])
    @pytest.mark.parametrize("route_key", ["POST /v1/parse", "GET /v1/sources", "GET /v1/usage", "GET /v1/health"])
    def test_v1_routes_skip_the_check(self, mode, route_key, caplog):
        with _mode(mode), caplog.at_level(logging.WARNING):
            resp = webhook.handler(_event(route_key), None)
        # /v1 is served by the API Lambda; here it simply isn't a webhook route.
        assert resp["statusCode"] == 404
        assert _auth_warnings(caplog) == []

    def test_v1_lookalike_is_not_exempt(self, stub_handlers):
        with _mode("enforce"):
            resp = webhook.handler(_event("GET /v1beta/parse"), None)
        assert resp["statusCode"] == 401

    @pytest.mark.parametrize("route_key", sorted(WEBHOOK_ROUTES))
    def test_options_preflight_is_exempt(self, route_key, stub_handlers, caplog):
        with _mode("enforce"), caplog.at_level(logging.WARNING):
            resp = webhook.handler(_event(route_key, method="OPTIONS"), None)
        assert resp["statusCode"] == 200
        assert _auth_warnings(caplog) == []
        for mock in stub_handlers.values():
            mock.assert_not_called()


class TestModeConfig:

    def _reload_with(self, env_value):
        env = {k: v for k, v in os.environ.items() if k != "GATEWAY_AUTH_MODE"}
        if env_value is not None:
            env["GATEWAY_AUTH_MODE"] = env_value
        try:
            with patch.dict(os.environ, env, clear=True):
                importlib.reload(webhook)
                return webhook.GATEWAY_AUTH_MODE
        finally:
            importlib.reload(webhook)

    def test_default_is_log(self):
        assert self._reload_with(None) == "log"

    def test_enforce_is_read_from_env(self):
        assert self._reload_with(" Enforce ") == "enforce"


class TestSecretLoading:

    def test_token_comes_from_app_secrets_and_is_cached(self):
        get = MagicMock(return_value={"INTERNAL_GATEWAY_TOKEN": SECRET, "DATABASE_URL": "x"})
        with patch.object(webhook, "_internal_gateway_token", ""), patch.object(webhook, "get_secrets", get):
            assert webhook._get_internal_gateway_token() == SECRET
            assert webhook._get_internal_gateway_token() == SECRET
        assert get.call_count == 1

    def test_missing_key_is_not_cached(self):
        get = MagicMock(return_value={})
        with patch.object(webhook, "_internal_gateway_token", ""), patch.object(webhook, "get_secrets", get):
            assert webhook._get_internal_gateway_token() == ""
            assert webhook._get_internal_gateway_token() == ""
        assert get.call_count == 2


class TestDownloadHardening:

    def _bank_download(self, fmt):
        s3 = MagicMock()
        s3.generate_presigned_url.return_value = "https://s3.example/presigned"
        event = {"pathParameters": {"jobId": "job-1"}, "queryStringParameters": {"format": fmt}}
        with patch.object(webhook, "s3_client", s3), patch.object(webhook, "BANK_RESULTS_BUCKET", "bank-results"):
            resp = webhook.handle_bank_download(event)
        return resp, s3

    @pytest.mark.parametrize("fmt", [
        "../../../uploads/job-2/statement.pdf#",
        "qbo/../csv",
        "pdf",
        "",
        "csv%00",
        "metadata",
    ])
    def test_bank_download_rejects_bad_format_before_touching_s3(self, fmt):
        resp, s3 = self._bank_download(fmt)
        if fmt == "":
            # Empty means "not given": falls back to the qbo default.
            assert resp["statusCode"] == 200
            return
        assert resp["statusCode"] == 400
        s3.head_object.assert_not_called()
        s3.generate_presigned_url.assert_not_called()

    @pytest.mark.parametrize("fmt", ["csv", "qbo", "xero", "excel", "QBO"])
    def test_bank_download_accepts_allowlisted_formats(self, fmt):
        resp, s3 = self._bank_download(fmt)
        assert resp["statusCode"] == 200
        s3.head_object.assert_called_once_with(Bucket="bank-results", Key=f"bank/job-1/output_{fmt.lower()}.csv")

    def test_bank_download_filename_has_no_job_id(self):
        _, s3 = self._bank_download("qbo")
        disposition = s3.generate_presigned_url.call_args.kwargs["Params"]["ResponseContentDisposition"]
        assert "job-1" not in disposition
        assert disposition == 'attachment; filename="bank_statement_qbo.csv"'

    def test_crypto_download_rejects_bad_format(self):
        s3 = MagicMock()
        event = {"pathParameters": {"jobId": "job-1"}, "queryStringParameters": {"format": "../output"}}
        with patch.object(webhook, "s3_client", s3):
            resp = webhook.handle_download(event)
        assert resp["statusCode"] == 400
        s3.head_object.assert_not_called()

    def test_crypto_download_filename_has_no_job_id(self):
        s3 = MagicMock()
        s3.generate_presigned_url.return_value = "https://s3.example/presigned"
        event = {"pathParameters": {"jobId": "job-1"}, "queryStringParameters": {"format": "koinly"}}
        with patch.object(webhook, "s3_client", s3), patch.object(webhook, "RESULTS_BUCKET", "results"):
            resp = webhook.handle_download(event)
        assert resp["statusCode"] == 200
        disposition = s3.generate_presigned_url.call_args.kwargs["Params"]["ResponseContentDisposition"]
        assert "job-1" not in disposition
        assert disposition == 'attachment; filename="taxformatter_koinly.csv"'
