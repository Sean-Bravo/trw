"""
Tests for handlers/webhook.py handle_job_status — the failed branch returns
the parse outcome (reason, exchange, parser version) as `result` when the
processor wrote it, so the dashboard's status sync stores it in jobs.result.
"""

import json
import os
import sys
from unittest.mock import MagicMock, patch

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


def _client_error(code="NoSuchKey"):
    return ClientError({"Error": {"Code": code, "Message": code}}, "GetObject")


def _body(payload):
    body = MagicMock()
    body.read.return_value = json.dumps(payload).encode("utf-8")
    return {"Body": body}


def _status(error_payload):
    """Run handle_job_status for a job whose upload exists, has no output.csv,
    and has the given error.json."""
    s3 = MagicMock()
    s3.list_objects_v2.return_value = {"KeyCount": 1, "Contents": [{"Key": "uploads/job-1/f.csv"}]}
    s3.head_object.side_effect = _client_error("404")

    def get_object(Bucket, Key):
        if Key.endswith("error.json"):
            return _body(error_payload)
        raise _client_error()

    s3.get_object.side_effect = get_object
    with patch.object(webhook, "s3_client", s3), \
         patch.object(webhook, "UPLOADS_BUCKET", "uploads"), \
         patch.object(webhook, "RESULTS_BUCKET", "results"):
        resp = webhook.handle_job_status({"pathParameters": {"jobId": "job-1"}})
    assert resp["statusCode"] == 200
    return json.loads(resp["body"])


class TestFailedJobOutcome:

    def test_failed_job_carries_the_outcome_as_result(self):
        body = _status({
            "error": "Could not auto-detect exchange format",
            "reason": "detection_failed",
            "exchange": None,
            "parser_version": "2.3.1",
        })
        assert body["status"] == "failed"
        assert body["error"] == "Could not auto-detect exchange format"
        assert body["result"] == {"failure_reason": "detection_failed", "exchange": None, "parser_version": "2.3.1"}

    def test_old_error_json_without_reason_has_no_result(self):
        # error.json written before Oct 14 has no outcome fields; the response
        # shape for those jobs is unchanged.
        body = _status({"error": "boom", "errors": [{"message": "boom"}]})
        assert body["status"] == "failed"
        assert "result" not in body

    def test_result_never_contains_diff_rows_the_job_page_would_render(self):
        body = _status({"error": "x", "reason": "parse_failed", "exchange": "kraken", "parser_version": "2.3.1"})
        assert not ({"original", "processed", "columns"} & set(body["result"]))


class TestCompletedJobNaN:

    def test_nan_in_result_json_comes_back_as_null(self):
        # Python's json.dumps writes a blank pandas cell as bare NaN; the
        # dashboard's JSON.parse rejected it and the job stuck on "Processing".
        s3 = MagicMock()
        s3.list_objects_v2.return_value = {"KeyCount": 1, "Contents": [{"Key": "uploads/job-1/f.csv"}]}
        body = MagicMock()
        body.read.return_value = b'{"record_count": 1, "original": [{" Amount": NaN, "Fee": Infinity}]}'
        s3.get_object.return_value = {"Body": body}
        with patch.object(webhook, "s3_client", s3), \
             patch.object(webhook, "UPLOADS_BUCKET", "uploads"), \
             patch.object(webhook, "RESULTS_BUCKET", "results"):
            resp = webhook.handle_job_status({"pathParameters": {"jobId": "job-1"}})

        assert "NaN" not in resp["body"] and "Infinity" not in resp["body"]
        parsed = json.loads(resp["body"], parse_constant=lambda c: (_ for _ in ()).throw(ValueError(c)))
        assert parsed["status"] == "completed"
        assert parsed["result"]["original"] == [{" Amount": None, "Fee": None}]
