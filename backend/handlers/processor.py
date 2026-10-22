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
import math
import traceback
import tempfile
import boto3
from typing import Any, Dict, List, Optional
from io import BytesIO

# Add services directory to path for imports
# In Lambda, services is at /var/task/services (same level as processor.py)
# Locally, services is at ../services relative to handlers/
services_path = os.path.join(os.path.dirname(__file__), "services")
if not os.path.exists(services_path):
    services_path = os.path.join(os.path.dirname(__file__), "..", "services")
sys.path.insert(0, services_path)

from safe_errors import safe_error_message  # noqa: E402
from csv_safety import sanitize_csv_records  # noqa: E402

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


def _failure_reason(result):
    """Classify an engine failure for CloudWatch without copying file content.

    Retention policy: logs carry source / parser version / reason only. The
    full engine message still goes to error.json (S3, 30 days) for the user.
    """
    errors = result.get("errors") or []
    message = str((errors[0] or {}).get("message", "")) if errors else ""
    if message.startswith("Could not auto-detect") or not result.get("exchange"):
        return "detection_failed"
    if message.startswith("No parser available"):
        return "no_parser"
    return "parse_failed"


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


def process_csv(file_data: bytes, filename: str, exchange_name: str = None) -> Dict[str, Any]:
    """
    Process CSV using the engine.

    Args:
        file_data: Raw CSV bytes
        filename: Original filename
        exchange_name: Optional manual exchange override (skips auto-detection)

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

        # Process the file with optional exchange override
        result = process_file(
            input_data=file_data,
            exchange_name=exchange_name,  # None = auto-detect, string = manual override
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
            # M-10: scrub formula injection vectors before writing
            writer.writerows(sanitize_csv_records(records))

        csv_content = output.getvalue()

        return {
            "success": True,
            "csv_output": csv_content,
            "record_count": len(records),
            "exchange": result.get("exchange"),
            "meta": result.get("meta", {}),
            "errors": result.get("errors", []),
            "warnings": result.get("warnings", []),
            # For diff view - original and processed data
            "original": result.get("original", []),
            "processed": records[:100],  # Limit to first 100 for diff view
            "columns": result.get("columns", []),
        }

    except ImportError as e:
        logger.exception("Failed to import engine")
        return {
            "success": False,
            "error": "Engine unavailable",
            "errors": [{"message": safe_error_message(e)}],
        }
    except Exception as e:
        logger.exception("Processing error")
        return {
            "success": False,
            "error": safe_error_message(e),
            "errors": [{"message": safe_error_message(e)}],
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


# Same ranking as getUserTier in lib/auth-db.ts: with several active keys,
# the highest tier wins.
JOB_TIER_SQL = """
    SELECT k.tier FROM api_keys k
    WHERE k.is_active = true
      AND k.user_id = (
        SELECT user_id FROM uploads WHERE s3_key = %s
        UNION ALL
        SELECT user_id FROM pending_uploads WHERE s3_key = %s
        LIMIT 1
      )
    ORDER BY CASE k.tier
      WHEN 'business' THEN 4
      WHEN 'growth'   THEN 3
      WHEN 'starter'  THEN 2
      ELSE 1
    END DESC
    LIMIT 1
"""

KNOWN_TIERS = ("free", "starter", "growth", "business")


def resolve_job_tier(s3_key: Optional[str]) -> str:
    """The insights tier for an upload, from its owner's row in Neon.

    The owner is whoever presign recorded the key for (pending_uploads,
    migration 018) or confirm bound it to (uploads). Anonymous uploads have
    neither row, so they are always free. Any lookup failure is also free:
    a paying user loses the better model for one job, which beats spending
    Opus on a job nobody paid for.
    """
    if not s3_key:
        return "free"
    try:
        from storage import get_db_connection

        with get_db_connection() as conn:
            if conn is None:
                logger.warning("job_tier_lookup_failed reason=no_database")
                return "free"
            with conn.cursor() as cur:
                cur.execute(JOB_TIER_SQL, (s3_key, s3_key))
                row = cur.fetchone()
    except Exception as e:
        logger.warning("job_tier_lookup_failed error_class=%s", type(e).__name__)
        return "free"
    tier = row[0] if row else "free"
    return tier if tier in KNOWN_TIERS else "free"


def generate_ai_insights(records: List[Dict], user_tier: str) -> Dict[str, Any]:
    """
    Generate AI insights for processed records.

    Args:
        records: List of transaction records
        user_tier: The owner's tier from resolve_job_tier (free, starter, growth, business)

    Returns:
        Dictionary with AI insights or error
    """
    try:
        from ai_insights import generate_insights, generate_quick_stats
        from quick_stats_normalizer import normalize_records, count_fees

        secrets = get_secrets()

        # Records here are UniversalRecord dicts (Koinly column names);
        # normalize to {type, date, asset} so generate_quick_stats's
        # field-name contract holds. Fees are counted out-of-band and
        # merged in afterward so total_transactions == len(records).
        quick_stats = generate_quick_stats(normalize_records(records))
        fee_count = count_fees(records)
        if fee_count:
            quick_stats.setdefault("transaction_types", {})["fee"] = fee_count

        # Free-tier cost guard: skip AI generation on unbounded inputs.
        # Gemini's per-token cost is small but free-tier abuse would still hurt;
        # the upstream 25-files/month cap throttles call frequency, this caps
        # per-call prompt size. Paid tiers retain full access.
        FREE_TIER_RECORD_CAP = 5000
        if user_tier == "free" and len(records) > FREE_TIER_RECORD_CAP:
            logger.info(
                f"Skipping AI insights for free tier: {len(records)} records exceeds "
                f"{FREE_TIER_RECORD_CAP}-row cap"
            )
            return {
                "success": True,
                "quick_stats": quick_stats,
                "ai_insights": None,
                "ai_error": "free_tier_size_limit",
                "tier": user_tier,
            }

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
                # model id, prompt version, effort — keeps stored flags reproducible
                "metadata": ai_result.get("metadata"),
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
                "metadata": ai_result.get("metadata"),
            }

    except ImportError as e:
        logger.warning(f"AI insights module not available: {e}")
        return {
            "success": False,
            "error": "AI insights not available",
        }
    except Exception as e:
        logger.exception("Error generating AI insights")
        return {
            "success": False,
            "error": safe_error_message(e),
        }


def run_shadow_insights(records: List[Dict], user_tier: str, job_id: str, insights_result: Dict) -> None:
    """Shadow-only model run on the tier's candidate model (ai_insights.SHADOW_CONFIG).

    Runs after the user's insights.json is already in S3, on the same
    normalized input, and writes results/{job_id}/insights_shadow.json — a
    key nothing serves (the webhook reads insights.json only) and that the
    job delete route and the 29-day lifecycle rule clean up with the rest.
    Nothing here can change what the user sees: every failure is a WARNING
    with the error class only (retention: never the message, which may
    quote cell values) and the function returns.
    """
    try:
        from ai_insights import generate_shadow_insights

        shadow = generate_shadow_insights(
            records, user_tier, get_secrets(),
            production_insights=insights_result.get("ai_insights"),
        )
        if shadow is None:
            return
        s3_client.put_object(
            Bucket=RESULTS_BUCKET,
            Key=f"results/{job_id}/insights_shadow.json",
            Body=json.dumps(shadow, default=str).encode("utf-8"),
            ContentType="application/json",
        )
        logger.info(f"Uploaded shadow insights for job {job_id}")
    except Exception as e:
        logger.warning(
            "insights_shadow_error job_id=%s tier=%s error_class=%s",
            job_id, user_tier, type(e).__name__,
        )


def _insights_outcome(insights_result: Optional[Dict]) -> Optional[Dict[str, Any]]:
    """The insights facts the review reads, pulled from generate_ai_insights'
    result: which model/prompt/effort/request type served the job, or why no
    insights were produced. None when insights never ran."""
    if not insights_result:
        return None
    meta = insights_result.get("metadata") or {}
    return {
        "model": meta.get("model"),
        "provider": meta.get("provider"),
        "prompt_version": meta.get("prompt_version"),
        "effort": meta.get("effort"),
        "request_type": meta.get("request_type"),
        "ai_error": insights_result.get("ai_error"),
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


def _json_safe(value: Any) -> Any:
    """NaN/Infinity -> None, so result.json is valid JSON (blank pandas cells
    in the diff rows are float NaN, which json.dumps writes as bare NaN)."""
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


def upload_result_json(bucket: str, job_id: str, result_data: Dict):
    """Upload result metadata (including diff data) to S3."""
    key = f"results/{job_id}/result.json"
    try:
        s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=json.dumps(_json_safe(result_data), default=str).encode("utf-8"),
            ContentType="application/json",
        )
        logger.info(f"Uploaded result.json to s3://{bucket}/{key}")
        return key
    except Exception as e:
        logger.error(f"Failed to upload result.json: {e}")
        return None


def process_message(message: Dict) -> Dict[str, Any]:
    """Process a single SQS message."""
    job_id = message.get("job_id")
    s3_bucket = message.get("s3_bucket")
    s3_key = message.get("s3_key")
    filename = message.get("filename")
    user_id = message.get("user_id", "anonymous")
    exchange_name = message.get("exchangeName")  # Optional manual exchange override

    # Ensure secrets are loaded (sets DATABASE_URL)
    get_secrets()

    # Issue #6: never the message's user_tier — anyone who could shape the
    # message could pick Business. The owner's api_keys row decides.
    user_tier = resolve_job_tier(s3_key)

    if exchange_name:
        logger.info(f"Processing job {job_id}: s3://{s3_bucket}/{s3_key} (tier: {user_tier}, exchange: {exchange_name})")
    else:
        logger.info(f"Processing job {job_id}: s3://{s3_bucket}/{s3_key} (tier: {user_tier})")

    try:
        # Download file from S3
        file_data = download_file(s3_bucket, s3_key)
        logger.info(f"Downloaded {len(file_data)} bytes")

        # Process the CSV (with optional exchange override)
        result = process_csv(file_data, filename, exchange_name)

        if result["success"]:
            # output.csv is uploaded last: the webhook reports the job
            # completed as soon as it exists, and the dashboard saves whatever
            # result.json holds at that moment. Uploaded first, it beat the
            # insights call and result.json by ~5s, so jobs were saved with
            # no diff data or exchange.

            # Generate and upload AI insights
            insights = None
            insights_result = None
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

            # Upload result.json with diff data for frontend. The outcome
            # fields (parser version, insights model/prompt/request type)
            # ride along so the dashboard's job-status sync stores them in
            # jobs.result and db/checks/funnel_outcomes.sql can read them.
            upload_result_json(RESULTS_BUCKET, job_id, {
                "record_count": result["record_count"],
                "exchange": result.get("exchange"),
                "parser_version": (result.get("meta") or {}).get("parser_version"),
                "insights": _insights_outcome(insights),
                "original": result.get("original", []),
                "processed": result.get("processed", []),
                "columns": result.get("columns", []),
            })

            result_key = upload_result(
                RESULTS_BUCKET,
                job_id,
                result["csv_output"],
            )

            # Shadow candidate (Fable 5.1 on Business) — after the user's
            # result is stored, never before, never in its place.
            if records:
                run_shadow_insights(records, user_tier, job_id, insights_result)

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
            # Upload error — with the classified reason and the parser
            # version, so a failed job's row says why and on which parser.
            upload_error(RESULTS_BUCKET, job_id, {
                "error": result.get("error"),
                "errors": result.get("errors", []),
                "warnings": result.get("warnings", []),
                "meta": result.get("meta", {}),
                "reason": _failure_reason(result),
                "exchange": result.get("exchange"),
                "parser_version": (result.get("meta") or {}).get("parser_version"),
            })

            logger.error(
                "parse_failed job_id=%s source=%s parser_version=%s reason=%s",
                job_id,
                result.get("exchange"),
                (result.get("meta") or {}).get("parser_version"),
                _failure_reason(result),
            )

            return {
                "success": False,
                "job_id": job_id,
                "error": result.get("error"),
            }

    except Exception as e:
        logger.error(
            "parse_failed job_id=%s reason=exception error_class=%s\n%s",
            job_id,
            type(e).__name__,
            "".join(traceback.format_tb(e.__traceback__)),
        )
        safe_msg = safe_error_message(e)

        # Upload error (sanitized — flows back to frontend job.error)
        upload_error(RESULTS_BUCKET, job_id, {
            "error": safe_msg,
            "errors": [{"message": safe_msg}],
            "reason": "exception",
        })

        return {
            "success": False,
            "job_id": job_id,
            "error": safe_msg,
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
