"""
Scanner Lambda Handler - S3 Trigger for file validation
Triggered by S3 ObjectCreated events on uploads bucket

Responsibilities:
1. Validate file size and type
2. Basic security checks (no executable content)
3. Queue file for processing via SQS
"""

import os
import json
import logging
import boto3
from typing import Any, Dict
from urllib.parse import unquote_plus

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
ENVIRONMENT = os.environ.get("ENVIRONMENT", "prod")
UPLOADS_BUCKET = os.environ.get("UPLOADS_BUCKET")
PROCESSING_QUEUE = os.environ.get("PROCESSING_QUEUE")
SECRETS_ARN = os.environ.get("SECRETS_ARN")

# AWS clients
s3_client = boto3.client("s3")
sqs_client = boto3.client("sqs")

# Limits
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"]


def validate_file(bucket: str, key: str) -> Dict[str, Any]:
    """
    Validate the uploaded file.

    Returns:
        {
            "valid": True/False,
            "error": "Error message" (if invalid),
            "metadata": {...}
        }
    """
    try:
        # Get file metadata
        response = s3_client.head_object(Bucket=bucket, Key=key)
        file_size = response.get("ContentLength", 0)
        content_type = response.get("ContentType", "")
        metadata = response.get("Metadata", {})

        # Extract job ID from key: uploads/{job_id}/filename.ext
        parts = key.split("/")
        if len(parts) < 3:
            return {"valid": False, "error": "Invalid S3 key format"}

        job_id = parts[1]
        filename = parts[-1]
        ext = os.path.splitext(filename.lower())[1]

        # Validate file size
        if file_size > MAX_FILE_SIZE:
            return {
                "valid": False,
                "error": f"File too large ({file_size / 1024 / 1024:.1f}MB). Maximum is 50MB.",
            }

        if file_size == 0:
            return {"valid": False, "error": "File is empty"}

        # Validate file extension
        if ext not in ALLOWED_EXTENSIONS:
            return {
                "valid": False,
                "error": f"Invalid file type '{ext}'. Allowed: {ALLOWED_EXTENSIONS}",
            }

        # Read first few KB to check for suspicious content
        try:
            obj = s3_client.get_object(
                Bucket=bucket,
                Key=key,
                Range="bytes=0-4096",  # First 4KB
            )
            content_sample = obj["Body"].read()

            # Check for executable signatures
            if content_sample.startswith(b"MZ") or content_sample.startswith(b"\x7fELF"):
                return {"valid": False, "error": "Executable files are not allowed"}

            # Check for ZIP/archive signatures (could be disguised malware)
            if content_sample.startswith(b"PK") and ext == ".csv":
                return {"valid": False, "error": "File appears to be an archive, not a CSV"}

        except Exception as e:
            logger.warning(f"Could not read file sample: {e}")
            # Continue anyway - basic validation passed

        logger.info(f"File validation passed: {key} ({file_size} bytes)")

        return {
            "valid": True,
            "metadata": {
                "job_id": job_id,
                "filename": filename,
                "file_size": file_size,
                "content_type": content_type,
                "user_id": metadata.get("user-id", "anonymous"),
                "s3_bucket": bucket,
                "s3_key": key,
            },
        }

    except s3_client.exceptions.ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        logger.error(f"S3 error during validation: {error_code} - {e}")
        return {"valid": False, "error": f"Could not access file: {error_code}"}
    except Exception as e:
        logger.error(f"Validation error: {e}")
        return {"valid": False, "error": str(e)}


def tag_file(bucket: str, key: str, status: str, error: str = None):
    """Add tags to the S3 object for tracking."""
    try:
        tags = [
            {"Key": "scan-status", "Value": status},
            {"Key": "scan-timestamp", "Value": str(int(__import__("time").time()))},
        ]
        if error:
            tags.append({"Key": "scan-error", "Value": error[:256]})

        s3_client.put_object_tagging(
            Bucket=bucket,
            Key=key,
            Tagging={"TagSet": tags},
        )
    except Exception as e:
        logger.warning(f"Failed to tag file: {e}")


def queue_for_processing(metadata: Dict) -> bool:
    """Send message to SQS processing queue."""
    try:
        message = {
            "job_id": metadata["job_id"],
            "s3_bucket": metadata["s3_bucket"],
            "s3_key": metadata["s3_key"],
            "filename": metadata["filename"],
            "file_size": metadata["file_size"],
            "user_id": metadata["user_id"],
        }

        response = sqs_client.send_message(
            QueueUrl=PROCESSING_QUEUE,
            MessageBody=json.dumps(message),
            MessageAttributes={
                "JobId": {
                    "DataType": "String",
                    "StringValue": metadata["job_id"],
                },
                "Environment": {
                    "DataType": "String",
                    "StringValue": ENVIRONMENT,
                },
            },
        )

        logger.info(f"Queued job {metadata['job_id']} for processing. MessageId: {response['MessageId']}")
        return True

    except Exception as e:
        logger.error(f"Failed to queue message: {e}")
        return False


def handler(event: Dict, context: Any) -> Dict:
    """
    Main Lambda handler - processes S3 events.

    Event structure (S3 trigger):
    {
        "Records": [
            {
                "s3": {
                    "bucket": {"name": "bucket-name"},
                    "object": {"key": "uploads/job-id/file.csv"}
                }
            }
        ]
    }
    """
    logger.info(f"Received event: {json.dumps(event)}")

    results = []

    for record in event.get("Records", []):
        s3_info = record.get("s3", {})
        bucket = s3_info.get("bucket", {}).get("name")
        key = unquote_plus(s3_info.get("object", {}).get("key", ""))

        if not bucket or not key:
            logger.warning(f"Invalid S3 event record: {record}")
            continue

        # Skip non-upload files (e.g., temporary files, folders)
        if not key.startswith("uploads/") or key.endswith("/"):
            logger.info(f"Skipping non-upload file: {key}")
            continue

        logger.info(f"Processing: s3://{bucket}/{key}")

        # Validate the file
        validation = validate_file(bucket, key)

        if not validation["valid"]:
            logger.error(f"Validation failed for {key}: {validation['error']}")
            tag_file(bucket, key, "failed", validation["error"])
            results.append({
                "key": key,
                "success": False,
                "error": validation["error"],
            })
            continue

        # Tag as validated
        tag_file(bucket, key, "validated")

        # Queue for processing
        if queue_for_processing(validation["metadata"]):
            tag_file(bucket, key, "queued")
            results.append({
                "key": key,
                "success": True,
                "job_id": validation["metadata"]["job_id"],
            })
        else:
            tag_file(bucket, key, "queue-failed")
            results.append({
                "key": key,
                "success": False,
                "error": "Failed to queue for processing",
            })

    return {
        "statusCode": 200,
        "body": json.dumps({
            "processed": len(results),
            "results": results,
        }),
    }
