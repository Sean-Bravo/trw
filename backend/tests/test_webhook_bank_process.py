"""
Tests for handlers/webhook.py handle_bank_process — issue #2 of the Oct 17
security report. The Lambda only reads a PDF under bank/{jobId}/ whose
user-id metadata matches the caller, caps size and pages before parsing, and
never returns raw exception text.
"""

import json
import os
import sys
from unittest.mock import MagicMock, patch

sys.modules.setdefault("boto3", MagicMock())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services"))

try:
    from botocore.exceptions import ClientError  # noqa: F401  installed in the Lambda package and CI
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

JOB_ID = "3f1c2a9e-8b7d-4c6e-9f0a-1b2c3d4e5f60"
OTHER_JOB_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
KEY = f"bank/{JOB_ID}/statement.pdf"
OWNER = "user-1"


def _event(**overrides):
    body = {"jobId": JOB_ID, "s3Key": KEY, "userId": OWNER, "outputFormat": "csv"}
    body.update(overrides)
    return {"body": json.dumps({k: v for k, v in body.items() if v is not None})}


def _s3(owner=OWNER, length=1024, data=b"%PDF-1.7 fake"):
    s3 = MagicMock()
    pdf_body = MagicMock()
    pdf_body.read.return_value = data
    s3.get_object.return_value = {
        "Body": pdf_body,
        "ContentLength": length,
        "Metadata": {"user-id": owner} if owner is not None else {},
    }
    return s3


def _run(event, s3, pages=3, processor=None):
    if processor is None:
        processor = MagicMock()
        processor.process.return_value = {"success": False, "error": "No transactions found in PDF", "warnings": []}
    bank_module = MagicMock()
    bank_module.BankStatementProcessor.return_value = processor
    with patch.object(webhook, "s3_client", s3), \
         patch.object(webhook, "BANK_UPLOADS_BUCKET", "uploads"), \
         patch.object(webhook, "BANK_RESULTS_BUCKET", "results"), \
         patch.object(webhook, "_count_pdf_pages", return_value=pages), \
         patch.dict(sys.modules, {"services.bank_statement": bank_module}):
        resp = webhook.handle_bank_process(event)
    return resp, json.loads(resp["body"]), processor


class TestJobAndKeyBinding:

    def test_owner_with_key_under_job_prefix_reaches_the_parser(self):
        s3 = _s3()
        resp, _, processor = _run(_event(), s3)
        s3.get_object.assert_called_once_with(Bucket="uploads", Key=KEY)
        processor.process.assert_called_once()
        assert resp["statusCode"] == 400  # the stub parser found no transactions

    def test_key_outside_the_job_prefix_is_rejected_before_s3(self):
        s3 = _s3()
        resp, body, processor = _run(_event(s3Key=f"bank/{OTHER_JOB_ID}/victim.pdf"), s3)
        assert resp["statusCode"] == 400
        assert body["error"] == "s3Key does not belong to this job"
        s3.get_object.assert_not_called()
        s3.put_object.assert_not_called()
        processor.process.assert_not_called()

    def test_key_in_another_prefix_is_rejected(self):
        s3 = _s3()
        resp, _, _ = _run(_event(s3Key=f"uploads/{JOB_ID}/x.pdf"), s3)
        assert resp["statusCode"] == 400
        s3.get_object.assert_not_called()

    def test_key_that_only_shares_a_prefix_string_is_rejected(self):
        # bank/{jobId}-evil/... starts with "bank/{jobId}" but not "bank/{jobId}/".
        s3 = _s3()
        resp, _, _ = _run(_event(s3Key=f"bank/{JOB_ID}-evil/x.pdf"), s3)
        assert resp["statusCode"] == 400
        s3.get_object.assert_not_called()

    def test_non_uuid_job_id_is_rejected(self):
        s3 = _s3()
        resp, body, _ = _run(_event(jobId="../uploads", s3Key="bank/../uploads/x.pdf"), s3)
        assert resp["statusCode"] == 400
        assert body["error"] == "Invalid jobId"
        s3.get_object.assert_not_called()

    def test_uppercase_uuid_is_rejected(self):
        # Only the canonical form the presign handler generates is accepted, so
        # one upload can't be addressed under two job ids.
        s3 = _s3()
        upper = JOB_ID.upper()
        resp, _, _ = _run(_event(jobId=upper, s3Key=f"bank/{upper}/s.pdf"), s3)
        assert resp["statusCode"] == 400
        s3.get_object.assert_not_called()

    def test_missing_user_id_is_rejected(self):
        s3 = _s3()
        resp, _, _ = _run(_event(userId=None), s3)
        assert resp["statusCode"] == 400
        s3.get_object.assert_not_called()


class TestMetadataOwner:

    def test_mismatched_metadata_owner_is_forbidden_before_any_read_or_write(self):
        s3 = _s3(owner="user-2")
        resp, body, processor = _run(_event(), s3)
        assert resp["statusCode"] == 403
        assert body["error"] == "Forbidden"
        s3.get_object.return_value["Body"].read.assert_not_called()
        s3.put_object.assert_not_called()
        processor.process.assert_not_called()

    def test_object_without_owner_metadata_is_forbidden(self):
        s3 = _s3(owner=None)
        resp, _, processor = _run(_event(), s3)
        assert resp["statusCode"] == 403
        s3.put_object.assert_not_called()
        processor.process.assert_not_called()


class TestCaps:

    def test_oversized_object_is_rejected_before_the_body_is_read(self):
        s3 = _s3(length=webhook.MAX_BANK_PDF_SIZE + 1)
        resp, _, processor = _run(_event(), s3)
        assert resp["statusCode"] == 413
        s3.get_object.return_value["Body"].read.assert_not_called()
        processor.process.assert_not_called()

    def test_body_longer_than_its_reported_length_is_still_capped(self):
        s3 = _s3(length=10, data=b"x" * (webhook.MAX_BANK_PDF_SIZE + 1))
        resp, _, processor = _run(_event(), s3)
        assert resp["statusCode"] == 413
        s3.get_object.return_value["Body"].read.assert_called_once_with(webhook.MAX_BANK_PDF_SIZE + 1)
        processor.process.assert_not_called()

    def test_too_many_pages_is_rejected_before_parsing(self):
        s3 = _s3()
        resp, _, processor = _run(_event(), s3, pages=webhook.MAX_BANK_PDF_PAGES + 1)
        assert resp["statusCode"] == 413
        processor.process.assert_not_called()
        s3.put_object.assert_not_called()

    def test_unreadable_pdf_is_a_400_not_a_500(self):
        s3 = _s3()
        with patch.object(webhook, "s3_client", s3), \
             patch.object(webhook, "BANK_UPLOADS_BUCKET", "uploads"), \
             patch.object(webhook, "_count_pdf_pages", side_effect=ValueError("bad xref at /tmp/x")):
            resp = webhook.handle_bank_process(_event())
        body = json.loads(resp["body"])
        assert resp["statusCode"] == 400
        assert body["error"] == "Could not read PDF"
        assert "xref" not in resp["body"]


class TestErrorResponses:

    def test_unexpected_exception_text_is_not_returned(self):
        processor = MagicMock()
        processor.process.side_effect = RuntimeError("secret internal path /var/task/x.py")
        resp, body, _ = _run(_event(), _s3(), processor=processor)
        assert resp["statusCode"] == 500
        assert body == {"error": "Processing failed"}
        assert "secret" not in resp["body"]
