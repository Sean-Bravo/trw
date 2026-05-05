"""
Tests for handlers/scanner.py — focused on the user_tier propagation added
in the Tiered AI Insights wire-up. Other scanner behaviors (size caps,
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


class TestUserTierPropagation:
    """user_tier rides S3 object metadata → scanner extracts it → SQS message includes it."""

    def test_validate_file_extracts_user_tier_from_metadata(self):
        scanner_mod.s3_client.head_object = MagicMock(
            return_value=_mock_head_object({
                "user-id": "user-1",
                "user-tier": "growth",
                "job-id": "job-abc",
            })
        )
        scanner_mod.s3_client.get_object = MagicMock(return_value=_mock_get_object_body())

        result = scanner_mod.validate_file("uploads-bucket", "uploads/job-abc/test.csv")

        assert result["valid"] is True
        assert result["metadata"]["user_id"] == "user-1"
        assert result["metadata"]["user_tier"] == "growth"

    def test_validate_file_defaults_user_tier_to_free_when_missing(self):
        # Older uploads pre-Tiered-AI-Insights won't have the user-tier metadata.
        scanner_mod.s3_client.head_object = MagicMock(
            return_value=_mock_head_object({
                "user-id": "user-1",
                "job-id": "job-abc",
            })
        )
        scanner_mod.s3_client.get_object = MagicMock(return_value=_mock_get_object_body())

        result = scanner_mod.validate_file("uploads-bucket", "uploads/job-abc/test.csv")

        assert result["valid"] is True
        assert result["metadata"]["user_tier"] == "free"

    def test_queue_for_processing_includes_user_tier_in_sqs_message(self):
        sent_messages = []

        def capture_send_message(**kwargs):
            sent_messages.append(kwargs)
            return {"MessageId": "msg-1"}

        scanner_mod.sqs_client.send_message = MagicMock(side_effect=capture_send_message)

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
        assert len(sent_messages) == 1
        body = json.loads(sent_messages[0]["MessageBody"])
        assert body["user_tier"] == "business"
        assert body["user_id"] == "user-1"
        assert body["job_id"] == "job-abc"

    def test_queue_for_processing_defaults_to_free_if_metadata_lacks_tier(self):
        sent_messages = []
        scanner_mod.sqs_client.send_message = MagicMock(
            side_effect=lambda **kwargs: (sent_messages.append(kwargs), {"MessageId": "msg-1"})[1]
        )

        # Hypothetical: validate_file's defaulting fails for some reason and metadata
        # arrives without user_tier. queue_for_processing should still default to 'free'
        # rather than raising KeyError.
        metadata = {
            "job_id": "job-abc",
            "filename": "test.csv",
            "file_size": 1024,
            "content_type": "text/csv",
            "user_id": "user-1",
            "s3_bucket": "uploads-bucket",
            "s3_key": "uploads/job-abc/test.csv",
        }

        ok = scanner_mod.queue_for_processing(metadata)

        assert ok is True
        body = json.loads(sent_messages[0]["MessageBody"])
        assert body["user_tier"] == "free"
