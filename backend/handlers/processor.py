"""
Processor Lambda Handler - SQS Trigger for CSV processing
Triggered by SQS messages from the processing queue

Responsibilities:
1. Download file from S3
2. Process CSV using engine.py
3. Upload result to results bucket
4. Send completion email (optional)
"""

import os
import sys
import json
import logging
import tempfile
import boto3
from typing import Any, Dict, List
from io import BytesIO

# Add services directory to path for imports
# In Lambda, services is at /var/task/services (same level as processor.py)
# Locally, services is at ../services relative to handlers/
services_path = os.path.join(os.path.dirname(__file__), "services")
if not os.path.exists(services_path):
    services_path = os.path.join(os.path.dirname(__file__), "..", "services")
sys.path.insert(0, services_path)

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
ENVIRONMENT = os.environ.get("ENVIRONMENT", "prod")
UPLOADS_BUCKET = os.environ.get("UPLOADS_BUCKET")
RESULTS_BUCKET = os.environ.get("RESULTS_BUCKET")
SECRETS_ARN = os.environ.get("SECRETS_ARN")

# AWS clients
s3_client = boto3.client("s3")
secretsmanager = boto3.client("secretsmanager")
ses_client = boto3.client("ses")

# Secrets cache
_secrets_cache: Dict[str, str] = {}


def get_secrets() -> Dict[str, str]:
    """Fetch secrets from AWS Secrets Manager with caching."""
    global _secrets_cache
    if _secrets_cache:
        return _secrets_cache

    try:
        response = secretsmanager.get_secret_value(SecretId=SECRETS_ARN)
        _secrets_cache = json.loads(response["SecretString"])

        # Set DATABASE_URL for storage module
        if "DATABASE_URL" in _secrets_cache:
            os.environ["DATABASE_URL"] = _secrets_cache["DATABASE_URL"]

        return _secrets_cache
    except Exception as e:
        logger.error(f"Failed to fetch secrets: {e}")
        return {}


def download_file(bucket: str, key: str) -> bytes:
    """Download file from S3."""
    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        return response["Body"].read()
    except Exception as e:
        logger.error(f"Failed to download s3://{bucket}/{key}: {e}")
        raise


def upload_result(bucket: str, job_id: str, content: str, filename: str = "output.csv"):
    """Upload processed result to S3."""
    key = f"results/{job_id}/{filename}"
    try:
        s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=content.encode("utf-8"),
            ContentType="text/csv",
            Metadata={
                "job-id": job_id,
                "processed-at": str(int(__import__("time").time())),
            },
        )
        logger.info(f"Uploaded result to s3://{bucket}/{key}")
        return key
    except Exception as e:
        logger.error(f"Failed to upload result: {e}")
        raise


def upload_error(bucket: str, job_id: str, error: Dict):
    """Upload error details to S3."""
    key = f"results/{job_id}/error.json"
    try:
        s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=json.dumps(error).encode("utf-8"),
            ContentType="application/json",
        )
        logger.info(f"Uploaded error to s3://{bucket}/{key}")
    except Exception as e:
        logger.error(f"Failed to upload error: {e}")


def process_csv(file_data: bytes, filename: str) -> Dict[str, Any]:
    """
    Process CSV using the engine.

    Returns:
        {
            "success": True/False,
            "csv_output": "csv content string",
            "meta": {...},
            "errors": [...],
            "warnings": [...]
        }
    """
    try:
        # Import engine (after DATABASE_URL is set)
        from engine import process_file

        # Process the file
        result = process_file(
            input_data=file_data,
            exchange_name=None,  # Auto-detect
            debug=False,
            deduplicate=True,
        )

        if not result.get("success"):
            return {
                "success": False,
                "error": result.get("errors", [{"message": "Processing failed"}])[0].get("message"),
                "errors": result.get("errors", []),
                "warnings": result.get("warnings", []),
                "meta": result.get("meta", {}),
            }

        # Convert records to CSV
        records = result.get("records", [])
        if not records:
            return {
                "success": False,
                "error": "No records generated",
                "errors": [{"message": "No valid records found in file"}],
                "warnings": result.get("warnings", []),
                "meta": result.get("meta", {}),
            }

        # Build CSV output
        import csv
        from io import StringIO

        output = StringIO()
        if records:
            # Get headers from first record
            fieldnames = list(records[0].keys())
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(records)

        csv_content = output.getvalue()

        return {
            "success": True,
            "csv_output": csv_content,
            "record_count": len(records),
            "exchange": result.get("exchange"),
            "meta": result.get("meta", {}),
            "errors": result.get("errors", []),
            "warnings": result.get("warnings", []),
        }

    except ImportError as e:
        logger.error(f"Failed to import engine: {e}")
        return {
            "success": False,
            "error": f"Engine import error: {e}",
            "errors": [{"message": str(e)}],
        }
    except Exception as e:
        logger.error(f"Processing error: {e}")
        return {
            "success": False,
            "error": str(e),
            "errors": [{"message": str(e)}],
        }


def send_completion_email(job_id: str, user_email: str, success: bool, error: str = None):
    """Send email notification when processing completes."""
    secrets = get_secrets()
    sender = secrets.get("SES_SENDER_EMAIL")

    if not sender or not user_email:
        logger.info("Skipping email notification (no sender or recipient)")
        return

    try:
        if success:
            subject = "Your TaxFormatter file is ready!"
            body = f"""
            Hi there,

            Great news! Your CSV file has been processed successfully.

            Job ID: {job_id}

            You can download your formatted file from the TaxFormatter dashboard.

            Thanks for using TaxFormatter!
            """
        else:
            subject = "TaxFormatter processing issue"
            body = f"""
            Hi there,

            We encountered an issue processing your file.

            Job ID: {job_id}
            Error: {error or "Unknown error"}

            Please try uploading your file again or contact support if the issue persists.

            Thanks,
            The TaxFormatter Team
            """

        ses_client.send_email(
            Source=sender,
            Destination={"ToAddresses": [user_email]},
            Message={
                "Subject": {"Data": subject},
                "Body": {"Text": {"Data": body}},
            },
        )
        logger.info(f"Sent completion email to {user_email}")

    except Exception as e:
        logger.warning(f"Failed to send email: {e}")


def generate_ai_insights(records: List[Dict], user_tier: str) -> Dict[str, Any]:
    """
    Generate AI insights for processed records.

    Args:
        records: List of transaction records
        user_tier: User's subscription tier (free, pro, premium)

    Returns:
        Dictionary with AI insights or error
    """
    try:
        from ai_insights import generate_insights, generate_quick_stats

        secrets = get_secrets()

        # Always generate quick stats (no AI needed)
        quick_stats = generate_quick_stats(records)

        # Try to generate AI insights
        ai_result = generate_insights(records, user_tier, secrets)

        if ai_result.get("success"):
            return {
                "success": True,
                "quick_stats": quick_stats,
                "ai_insights": ai_result.get("insights", {}),
                "model": ai_result.get("model"),
                "provider": ai_result.get("provider"),
                "tier": user_tier,
            }
        else:
            # AI failed, return quick stats only
            logger.warning(f"AI insights failed: {ai_result.get('error')}")
            return {
                "success": True,
                "quick_stats": quick_stats,
                "ai_insights": None,
                "ai_error": ai_result.get("error"),
                "tier": user_tier,
            }

    except ImportError as e:
        logger.warning(f"AI insights module not available: {e}")
        return {
            "success": False,
            "error": "AI insights not available",
        }
    except Exception as e:
        logger.error(f"Error generating AI insights: {e}")
        return {
            "success": False,
            "error": str(e),
        }


def upload_insights(bucket: str, job_id: str, insights: Dict):
    """Upload AI insights to S3."""
    key = f"results/{job_id}/insights.json"
    try:
        s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=json.dumps(insights, default=str).encode("utf-8"),
            ContentType="application/json",
        )
        logger.info(f"Uploaded insights to s3://{bucket}/{key}")
        return key
    except Exception as e:
        logger.error(f"Failed to upload insights: {e}")
        return None


def process_message(message: Dict) -> Dict[str, Any]:
    """Process a single SQS message."""
    job_id = message.get("job_id")
    s3_bucket = message.get("s3_bucket")
    s3_key = message.get("s3_key")
    filename = message.get("filename")
    user_id = message.get("user_id", "anonymous")
    user_tier = message.get("user_tier", "free")  # Default to free tier

    logger.info(f"Processing job {job_id}: s3://{s3_bucket}/{s3_key} (tier: {user_tier})")

    # Ensure secrets are loaded (sets DATABASE_URL)
    get_secrets()

    try:
        # Download file from S3
        file_data = download_file(s3_bucket, s3_key)
        logger.info(f"Downloaded {len(file_data)} bytes")

        # Process the CSV
        result = process_csv(file_data, filename)

        if result["success"]:
            # Upload result
            result_key = upload_result(
                RESULTS_BUCKET,
                job_id,
                result["csv_output"],
            )

            # Generate and upload AI insights
            insights = None
            # Parse the CSV output back to records for AI analysis
            import csv
            from io import StringIO
            reader = csv.DictReader(StringIO(result["csv_output"]))
            records = list(reader)

            if records:
                insights_result = generate_ai_insights(records, user_tier)
                if insights_result.get("success") or insights_result.get("quick_stats"):
                    upload_insights(RESULTS_BUCKET, job_id, insights_result)
                    insights = insights_result

            logger.info(f"Job {job_id} completed successfully. {result['record_count']} records.")

            return {
                "success": True,
                "job_id": job_id,
                "result_key": result_key,
                "record_count": result["record_count"],
                "exchange": result.get("exchange"),
                "has_insights": insights is not None,
            }
        else:
            # Upload error
            upload_error(RESULTS_BUCKET, job_id, {
                "error": result.get("error"),
                "errors": result.get("errors", []),
                "warnings": result.get("warnings", []),
                "meta": result.get("meta", {}),
            })

            logger.error(f"Job {job_id} failed: {result.get('error')}")

            return {
                "success": False,
                "job_id": job_id,
                "error": result.get("error"),
            }

    except Exception as e:
        logger.error(f"Job {job_id} failed with exception: {e}")

        # Upload error
        upload_error(RESULTS_BUCKET, job_id, {
            "error": str(e),
            "errors": [{"message": str(e)}],
        })

        return {
            "success": False,
            "job_id": job_id,
            "error": str(e),
        }


def handler(event: Dict, context: Any) -> Dict:
    """
    Main Lambda handler - processes SQS messages.

    Event structure (SQS trigger):
    {
        "Records": [
            {
                "messageId": "...",
                "body": "{\"job_id\": \"...\", \"s3_bucket\": \"...\", ...}"
            }
        ]
    }

    Returns batch item failures for partial batch response.
    """
    logger.info(f"Received event with {len(event.get('Records', []))} records")

    batch_item_failures: List[Dict] = []

    for record in event.get("Records", []):
        message_id = record.get("messageId")
        try:
            body = json.loads(record.get("body", "{}"))
            result = process_message(body)

            if not result["success"]:
                # Don't fail the batch - error is recorded in S3
                logger.warning(f"Message {message_id} processed with error: {result.get('error')}")

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in message {message_id}: {e}")
            # Report as batch failure for retry
            batch_item_failures.append({"itemIdentifier": message_id})
        except Exception as e:
            logger.error(f"Unexpected error processing message {message_id}: {e}")
            # Report as batch failure for retry
            batch_item_failures.append({"itemIdentifier": message_id})

    # Return batch item failures for SQS partial batch response
    return {
        "batchItemFailures": batch_item_failures,
    }
