"""
Tests for handlers/scanner.py — focused on the SQS message no longer
carrying a tier (Oct 17 security report issue #6). Other scanner behaviors (size caps,
extension validation, malware sniffing) are out of scope here; they're
covered by integration smoke tests against the live Lambda.
"""

import sys
import os
import json
from unittest.mock import MagicMock, patch

# Patch external deps before import
sys.modules["boto3"] = MagicMock()

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import handlers.scanner as scanner_mod


def _mock_head_object(metadata: dict, file_size: int = 1024, content_type: str = "text/csv"):
    """Build a minimal S3 head_object response with the given metadata."""
    return {
        "ContentLength": file_size,
        "ContentType": content_type,
        "Metadata": metadata,
    }


def _mock_get_object_body(content: bytes = b"Date,Amount\n2024,100"):
    """Build a minimal S3 get_object response."""
    body_mock = MagicMock()
    body_mock.read.return_value = content
    return {"Body": body_mock}


class TestNoTierInTheMessage:
    """Issue #6: the processor resolves the tier from Neon, so the scanner
    forwards none, even for an object still carrying a user-tier metadata
    value from before the fix."""

    def test_validate_file_ignores_user_tier_metadata(self):
        scanner_mod.s3_client.head_object = MagicMock(
            return_value=_mock_head_object({
                "user-id": "user-1",
                "user-tier": "business",
                "job-id": "job-abc",
            })
        )
        scanner_mod.s3_client.get_object = MagicMock(return_value=_mock_get_object_body())

        result = scanner_mod.validate_file("uploads-bucket", "uploads/job-abc/test.csv")

        assert result["valid"] is True
        assert result["metadata"]["user_id"] == "user-1"
        assert "user_tier" not in result["metadata"]

    def test_queue_for_processing_sends_no_user_tier(self):
        sent_messages = []
        scanner_mod.sqs_client.send_message = MagicMock(
            side_effect=lambda **kwargs: (sent_messages.append(kwargs), {"MessageId": "msg-1"})[1]
        )

        metadata = {
            "job_id": "job-abc",
            "filename": "test.csv",
            "file_size": 1024,
            "content_type": "text/csv",
            "user_id": "user-1",
            "user_tier": "business",
            "s3_bucket": "uploads-bucket",
            "s3_key": "uploads/job-abc/test.csv",
        }

        ok = scanner_mod.queue_for_processing(metadata)

        assert ok is True
        body = json.loads(sent_messages[0]["MessageBody"])
        assert "user_tier" not in body
        assert body["user_id"] == "user-1"
        assert body["job_id"] == "job-abc"
        assert body["s3_key"] == "uploads/job-abc/test.csv"
