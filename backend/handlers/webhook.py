"""
Webhook Lambda Handler - API Gateway entry point
Handles: presigned URLs, confirm upload, job status, download URLs, AI insights, retry, delete

Routes:
- POST /presigned-url - Generate S3 presigned URL for upload
- POST /confirm-upload - Confirm file upload completed
- GET /job/{jobId} - Get job status
- POST /job/{jobId}/retry - Retry a failed job
- GET /download/{jobId} - Get presigned download URL
- GET /insights/{jobId} - Get AI insights for job
- DELETE /delete/{jobId} - Delete all files for a job (user-requested deletion)
"""

import os
import json
import uuid
import logging
import boto3
from botocore.exceptions import ClientError
from datetime import datetime
from typing import Any, Dict, Optional

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
sqs_client = boto3.client("sqs")
secretsmanager = boto3.client("secretsmanager")

# SQS Queue URL
PROCESSOR_QUEUE_URL = os.environ.get("PROCESSOR_QUEUE_URL")

# Presigned URL expiration (15 minutes for upload, 1 hour for download)
UPLOAD_EXPIRATION = 900
DOWNLOAD_EXPIRATION = 3600

# Maximum file size (50MB)
MAX_FILE_SIZE = 50 * 1024 * 1024


def get_secrets() -> Dict[str, str]:
    """Fetch secrets from AWS Secrets Manager."""
    try:
        response = secretsmanager.get_secret_value(SecretId=SECRETS_ARN)
        return json.loads(response["SecretString"])
    except Exception as e:
        logger.error(f"Failed to fetch secrets: {e}")
        return {}


def response(status_code: int, body: Any, headers: Optional[Dict] = None) -> Dict:
    """Generate API Gateway response."""
    default_headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    }
    if headers:
        default_headers.update(headers)

    return {
        "statusCode": status_code,
        "headers": default_headers,
        "body": json.dumps(body) if isinstance(body, dict) else body,
    }


def handle_presigned_url(event: Dict) -> Dict:
    """
    Generate a presigned URL for S3 upload.

    Request body:
    {
        "filename": "coinbase_export.csv",
        "contentType": "text/csv",
        "userId": "user_123"  # Optional
    }

    Response:
    {
        "uploadUrl": "https://s3.amazonaws.com/...",
        "jobId": "uuid",
        "key": "uploads/uuid/filename.csv"
    }
    """
    try:
        body = json.loads(event.get("body", "{}"))
    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON body"})

    filename = body.get("filename")
    content_type = body.get("contentType", "text/csv")
    user_id = body.get("userId", "anonymous")

    if not filename:
        return response(400, {"error": "filename is required"})

    # Validate file extension
    allowed_extensions = [".csv", ".xlsx", ".xls"]
    ext = os.path.splitext(filename.lower())[1]
    if ext not in allowed_extensions:
        return response(400, {"error": f"Invalid file type. Allowed: {allowed_extensions}"})

    # Generate job ID and S3 key
    job_id = str(uuid.uuid4())
    safe_filename = filename.replace(" ", "_").replace("/", "_")
    s3_key = f"uploads/{job_id}/{safe_filename}"

    try:
        # Generate presigned URL
        presigned_url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": UPLOADS_BUCKET,
                "Key": s3_key,
                "ContentType": content_type,
                "Metadata": {
                    "user-id": user_id,
                    "original-filename": filename,
                    "job-id": job_id,
                },
            },
            ExpiresIn=UPLOAD_EXPIRATION,
        )

        logger.info(f"Generated presigned URL for job {job_id}")

        return response(200, {
            "uploadUrl": presigned_url,
            "jobId": job_id,
            "key": s3_key,
            "expiresIn": UPLOAD_EXPIRATION,
        })

    except Exception as e:
        logger.error(f"Failed to generate presigned URL: {e}")
        return response(500, {"error": "Failed to generate upload URL"})


def handle_confirm_upload(event: Dict) -> Dict:
    """
    Confirm that a file upload completed successfully.
    This is called by the frontend after the presigned URL upload finishes.

    Request body:
    {
        "jobId": "uuid",
        "key": "uploads/uuid/filename.csv"
    }

    Response:
    {
        "success": true,
        "jobId": "uuid",
        "status": "pending"
    }
    """
    try:
        body = json.loads(event.get("body", "{}"))
    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON body"})

    job_id = body.get("jobId")
    s3_key = body.get("key")

    if not job_id or not s3_key:
        return response(400, {"error": "jobId and key are required"})

    try:
        # Verify the file exists in S3
        s3_client.head_object(Bucket=UPLOADS_BUCKET, Key=s3_key)

        logger.info(f"Upload confirmed for job {job_id}")

        # The S3 trigger will automatically invoke the scanner Lambda
        return response(200, {
            "success": True,
            "jobId": job_id,
            "status": "pending",
            "message": "File uploaded successfully. Processing will begin shortly.",
        })

    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            return response(404, {"error": "File not found in S3"})
        logger.error(f"S3 error confirming upload: {e}")
        return response(500, {"error": "Failed to confirm upload"})


def handle_job_status(event: Dict) -> Dict:
    """
    Get the status of a processing job.

    Path: GET /job/{jobId}

    Response:
    {
        "jobId": "uuid",
        "status": "pending|processing|completed|failed",
        "progress": 50,
        "result": {...}  # Only if completed
    }
    """
    path_params = event.get("pathParameters", {}) or {}
    job_id = path_params.get("jobId")

    if not job_id:
        return response(400, {"error": "jobId is required"})

    logger.info(f"Getting status for job {job_id}, UPLOADS_BUCKET={UPLOADS_BUCKET}, RESULTS_BUCKET={RESULTS_BUCKET}")

    try:
        # Get filename from uploads bucket first (needed for all statuses)
        filename = "Unknown file"
        try:
            upload_result = s3_client.list_objects_v2(
                Bucket=UPLOADS_BUCKET,
                Prefix=f"uploads/{job_id}/",
                MaxKeys=1,
            )
            if upload_result.get("KeyCount", 0) > 0:
                s3_key = upload_result.get("Contents", [{}])[0].get("Key", "")
                filename = s3_key.split("/")[-1] if s3_key else "Unknown file"
        except ClientError:
            pass

        # Check if result file exists (completed)
        result_key = f"results/{job_id}/output.csv"
        try:
            s3_client.head_object(Bucket=RESULTS_BUCKET, Key=result_key)
            logger.info(f"Job {job_id} completed - found output.csv")

            # Try to load result.json for diff data
            result_data = None
            try:
                result_json_key = f"results/{job_id}/result.json"
                result_obj = s3_client.get_object(Bucket=RESULTS_BUCKET, Key=result_json_key)
                result_data = json.loads(result_obj["Body"].read().decode("utf-8"))
                logger.info(f"Job {job_id} loaded result.json")
            except ClientError:
                logger.info(f"Job {job_id} no result.json found")

            return response(200, {
                "jobId": job_id,
                "status": "completed",
                "progress": 100,
                "filename": filename,
                "result": result_data,
            })
        except ClientError as e:
            logger.info(f"Job {job_id} no output.csv: {e.response['Error']['Code']}")

        # If we found a file, check for error or processing status
        if filename != "Unknown file":
            # Check for error marker
            try:
                error_key = f"results/{job_id}/error.json"
                error_obj = s3_client.get_object(Bucket=RESULTS_BUCKET, Key=error_key)
                error_data = json.loads(error_obj["Body"].read().decode("utf-8"))
                logger.info(f"Job {job_id} failed - found error.json")
                return response(200, {
                    "jobId": job_id,
                    "status": "failed",
                    "error": error_data.get("error", "Unknown error"),
                    "filename": filename,
                })
            except ClientError as e:
                logger.info(f"Job {job_id} no error.json: {e.response['Error']['Code']}")

            # File exists but no result yet - still processing
            logger.info(f"Job {job_id} still processing")
            return response(200, {
                "jobId": job_id,
                "status": "processing",
                "progress": 50,
                "filename": filename,
            })

        # No files found
        logger.info(f"Job {job_id} not found - no files in uploads bucket")
        return response(404, {"error": "Job not found"})

    except Exception as e:
        logger.error(f"Error getting job status: {e}")
        return response(500, {"error": "Failed to get job status"})


def handle_download(event: Dict) -> Dict:
    """
    Get a presigned download URL for the processed file.

    Path: GET /download/{jobId}?format=koinly|turbotax|coinledger|zenledger

    Query params:
    - format: Output format (default: koinly)

    Response:
    {
        "downloadUrl": "https://s3.amazonaws.com/...",
        "expiresIn": 3600,
        "format": "koinly"
    }
    """
    path_params = event.get("pathParameters", {}) or {}
    job_id = path_params.get("jobId")

    if not job_id:
        return response(400, {"error": "jobId is required"})

    # Get format from query string
    query_params = event.get("queryStringParameters", {}) or {}
    output_format = query_params.get("format", "koinly").lower().strip()

    # Validate format
    valid_formats = ["koinly", "turbotax", "coinledger", "zenledger"]
    if output_format not in valid_formats:
        return response(400, {"error": f"Invalid format. Valid formats: {valid_formats}"})

    try:
        result_key = f"results/{job_id}/output.csv"

        # If format is koinly (default), return presigned URL directly
        if output_format == "koinly":
            # Verify the result file exists
            try:
                s3_client.head_object(Bucket=RESULTS_BUCKET, Key=result_key)
            except ClientError as e:
                if e.response["Error"]["Code"] == "404":
                    return response(404, {"error": "Result file not found. Job may still be processing."})
                raise

            # Generate presigned download URL
            download_url = s3_client.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": RESULTS_BUCKET,
                    "Key": result_key,
                    "ResponseContentDisposition": f'attachment; filename="{job_id}_koinly.csv"',
                },
                ExpiresIn=DOWNLOAD_EXPIRATION,
            )

            logger.info(f"Generated download URL for job {job_id} (format: koinly)")

            return response(200, {
                "downloadUrl": download_url,
                "expiresIn": DOWNLOAD_EXPIRATION,
                "format": "koinly",
            })

        # For other formats, check if converted file exists or convert on-the-fly
        converted_key = f"results/{job_id}/output_{output_format}.csv"

        try:
            # Check if converted file already exists
            s3_client.head_object(Bucket=RESULTS_BUCKET, Key=converted_key)
            logger.info(f"Using cached {output_format} format for job {job_id}")
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            # S3 returns 404 or 403 when file doesn't exist (403 if no ListBucket permission)
            if error_code in ("404", "403", "NoSuchKey", "AccessDenied"):
                # Need to convert - download original, convert, upload
                logger.info(f"Converting job {job_id} to {output_format} format (cache miss: {error_code})")

                try:
                    # Download original CSV
                    original_obj = s3_client.get_object(Bucket=RESULTS_BUCKET, Key=result_key)
                    csv_content = original_obj["Body"].read().decode("utf-8")

                    # Parse records from CSV
                    import csv
                    from io import StringIO
                    reader = csv.DictReader(StringIO(csv_content))
                    records = list(reader)

                    if not records:
                        return response(400, {"error": "No records found in result file"})

                    # Import converter
                    # In Lambda, format_converter.py is in the same directory (flat structure after deploy)
                    # Locally, it's in services/format_converter.py
                    try:
                        from format_converter import convert_records
                        logger.info("Imported convert_records from format_converter")
                    except ImportError as ie:
                        logger.warning(f"Direct format_converter import failed: {ie}, trying services path")
                        import sys
                        import os
                        # Try services path for local development
                        services_path = os.path.join(os.path.dirname(__file__), "..", "services")
                        if services_path not in sys.path:
                            sys.path.insert(0, services_path)
                        from format_converter import convert_records
                        logger.info("Imported convert_records from services/format_converter")

                    # Convert records with explicit error handling
                    logger.info(f"Converting {len(records)} records to {output_format} format")
                    try:
                        converted_records, fieldnames = convert_records(records, output_format)
                        logger.info(f"Conversion complete: {len(converted_records)} records, fields: {fieldnames}")
                    except Exception as conv_error:
                        logger.error(f"Format conversion failed: {conv_error}")
                        return response(500, {"error": f"Format conversion failed: {str(conv_error)}"})

                    if not converted_records:
                        return response(400, {"error": f"No records after conversion to {output_format} format"})

                    # Write converted CSV
                    output = StringIO()
                    writer = csv.DictWriter(output, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(converted_records)
                    converted_csv = output.getvalue()

                    # Upload converted file
                    s3_client.put_object(
                        Bucket=RESULTS_BUCKET,
                        Key=converted_key,
                        Body=converted_csv.encode("utf-8"),
                        ContentType="text/csv",
                        Metadata={
                            "job-id": job_id,
                            "format": output_format,
                            "converted-at": str(int(__import__("time").time())),
                        },
                    )
                    logger.info(f"Uploaded converted {output_format} file for job {job_id}")

                except ClientError as download_error:
                    if download_error.response["Error"]["Code"] == "NoSuchKey":
                        return response(404, {"error": "Result file not found. Job may still be processing."})
                    raise
            else:
                raise

        # Generate presigned download URL for converted file
        download_url = s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": RESULTS_BUCKET,
                "Key": converted_key,
                "ResponseContentDisposition": f'attachment; filename="{job_id}_{output_format}.csv"',
            },
            ExpiresIn=DOWNLOAD_EXPIRATION,
        )

        logger.info(f"Generated download URL for job {job_id} (format: {output_format})")

        return response(200, {
            "downloadUrl": download_url,
            "expiresIn": DOWNLOAD_EXPIRATION,
            "format": output_format,
        })

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        error_msg = e.response.get("Error", {}).get("Message", str(e))
        logger.error(f"S3 error in download handler: {error_code} - {error_msg}")
        if error_code == "AccessDenied":
            return response(500, {"error": "Server permission error accessing storage"})
        return response(500, {"error": f"Storage error: {error_code}"})
    except ImportError as e:
        logger.error(f"Import error in download handler: {e}")
        return response(500, {"error": f"Server configuration error: missing module"})
    except Exception as e:
        import traceback
        logger.error(f"Error generating download URL: {e}\n{traceback.format_exc()}")
        return response(500, {"error": f"Failed to generate download URL: {type(e).__name__}"})


def handle_job_retry(event: Dict) -> Dict:
    """
    Retry a failed job by re-sending it to the processor queue.

    Path: POST /job/{jobId}/retry

    Request body:
    {
        "s3Key": "uploads/jobId/filename.csv",
        "jobId": "uuid",
        "exchangeName": "coinbase"  // Optional - manual exchange override
    }

    Response:
    {
        "success": true,
        "message": "Job queued for retry"
    }
    """
    path_params = event.get("pathParameters", {}) or {}
    job_id = path_params.get("jobId")

    if not job_id:
        return response(400, {"error": "jobId is required"})

    try:
        body = json.loads(event.get("body", "{}"))
    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON body"})

    s3_key = body.get("s3Key")
    exchange_name = body.get("exchangeName")  # Optional manual override

    if not s3_key:
        return response(400, {"error": "s3Key is required"})

    try:
        # Verify the file still exists in S3
        try:
            s3_client.head_object(Bucket=UPLOADS_BUCKET, Key=s3_key)
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return response(404, {"error": "Original file no longer exists"})
            raise

        # Clear any existing error marker
        try:
            error_key = f"results/{job_id}/error.json"
            s3_client.delete_object(Bucket=RESULTS_BUCKET, Key=error_key)
            logger.info(f"Cleared error marker for job {job_id}")
        except ClientError:
            pass  # Error file may not exist

        # Send message to processor queue
        if not PROCESSOR_QUEUE_URL:
            logger.error("PROCESSOR_QUEUE_URL not configured")
            return response(500, {"error": "Queue not configured"})

        message = {
            "jobId": job_id,
            "bucket": UPLOADS_BUCKET,
            "key": s3_key,
            "retry": True,
        }

        # Add exchange override if specified
        if exchange_name:
            message["exchangeName"] = exchange_name
            logger.info(f"Job {job_id} retry with manual exchange: {exchange_name}")

        sqs_client.send_message(
            QueueUrl=PROCESSOR_QUEUE_URL,
            MessageBody=json.dumps(message),
        )

        logger.info(f"Job {job_id} queued for retry")

        return response(200, {
            "success": True,
            "message": f"Job queued for retry{f' with {exchange_name} parser' if exchange_name else ''}",
            "jobId": job_id,
            "exchangeName": exchange_name,
        })

    except Exception as e:
        logger.error(f"Error retrying job: {e}")
        return response(500, {"error": "Failed to retry job"})


def handle_insights(event: Dict) -> Dict:
    """
    Get AI insights for a processed job.

    Path: GET /insights/{jobId}

    Response:
    {
        "success": true,
        "quick_stats": {...},
        "ai_insights": {...},
        "tier": "free|pro|premium"
    }
    """
    path_params = event.get("pathParameters", {}) or {}
    job_id = path_params.get("jobId")

    if not job_id:
        return response(400, {"error": "jobId is required"})

    try:
        insights_key = f"results/{job_id}/insights.json"

        # Try to get insights file
        try:
            insights_obj = s3_client.get_object(Bucket=RESULTS_BUCKET, Key=insights_key)
            insights_data = json.loads(insights_obj["Body"].read().decode("utf-8"))

            logger.info(f"Retrieved insights for job {job_id}")

            return response(200, insights_data)

        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                # Check if job exists but insights not generated
                result_key = f"results/{job_id}/output.csv"
                try:
                    s3_client.head_object(Bucket=RESULTS_BUCKET, Key=result_key)
                    # Job completed but no insights
                    return response(200, {
                        "success": True,
                        "quick_stats": None,
                        "ai_insights": None,
                        "message": "Insights not available for this job",
                    })
                except ClientError:
                    pass

                return response(404, {"error": "Job not found or still processing"})
            raise

    except Exception as e:
        logger.error(f"Error getting insights: {e}")
        return response(500, {"error": "Failed to get insights"})


# =============================================================================
# Bank Statement Handlers
# =============================================================================

# Bank statement bucket (separate from crypto uploads)
BANK_UPLOADS_BUCKET = os.environ.get("BANK_UPLOADS_BUCKET", UPLOADS_BUCKET)
BANK_RESULTS_BUCKET = os.environ.get("BANK_RESULTS_BUCKET", RESULTS_BUCKET)


def handle_bank_presigned_url(event: Dict) -> Dict:
    """
    Generate presigned URL for bank statement PDF upload.

    Request body:
    {
        "filename": "chase_jan_2024.pdf",
        "contentType": "application/pdf",
        "userId": "user_123"
    }
    """
    try:
        body = json.loads(event.get("body", "{}"))
    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON body"})

    filename = body.get("filename")
    content_type = body.get("contentType", "application/pdf")
    user_id = body.get("userId", "anonymous")

    if not filename:
        return response(400, {"error": "filename is required"})

    # Validate file extension - PDF only for bank statements
    ext = os.path.splitext(filename.lower())[1]
    if ext != ".pdf":
        return response(400, {"error": "Only PDF files are allowed for bank statements"})

    # Generate job ID and S3 key
    job_id = str(uuid.uuid4())
    safe_filename = filename.replace(" ", "_").replace("/", "_")
    s3_key = f"bank/{job_id}/{safe_filename}"

    try:
        presigned_url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": BANK_UPLOADS_BUCKET,
                "Key": s3_key,
                "ContentType": content_type,
                "Metadata": {
                    "user-id": user_id,
                    "original-filename": filename,
                    "job-id": job_id,
                    "job-type": "bank",
                },
            },
            ExpiresIn=UPLOAD_EXPIRATION,
        )

        logger.info(f"Generated bank presigned URL for job {job_id}")

        return response(200, {
            "uploadUrl": presigned_url,
            "jobId": job_id,
            "key": s3_key,
            "expiresIn": UPLOAD_EXPIRATION,
        })

    except Exception as e:
        logger.error(f"Failed to generate bank presigned URL: {e}")
        return response(500, {"error": "Failed to generate upload URL"})


def handle_bank_process(event: Dict) -> Dict:
    """
    Process an uploaded bank statement PDF.

    Request body:
    {
        "jobId": "uuid",
        "s3Key": "bank/uuid/filename.pdf",
        "outputFormat": "qbo"  // or "xero", "excel"
    }
    """
    try:
        body = json.loads(event.get("body", "{}"))
    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON body"})

    job_id = body.get("jobId")
    s3_key = body.get("s3Key")
    output_format = body.get("outputFormat", "qbo")

    if not job_id or not s3_key:
        return response(400, {"error": "jobId and s3Key are required"})

    # Validate output format
    valid_formats = ["qbo", "xero", "excel"]
    if output_format not in valid_formats:
        return response(400, {"error": f"Invalid output format. Valid: {valid_formats}"})

    try:
        # Download PDF from S3
        logger.info(f"Downloading PDF for job {job_id}")
        pdf_response = s3_client.get_object(Bucket=BANK_UPLOADS_BUCKET, Key=s3_key)
        pdf_bytes = pdf_response["Body"].read()

        # Import processor
        try:
            from services.bank_statement import BankStatementProcessor
        except ImportError:
            # Lambda flat structure
            from bank_statement import BankStatementProcessor

        # Process PDF
        logger.info(f"Processing bank statement for job {job_id}")
        from io import BytesIO
        processor = BankStatementProcessor()
        result = processor.process(
            BytesIO(pdf_bytes),
            output_format=output_format,
            deduplicate=True,
        )

        if not result["success"]:
            # Save error
            error_key = f"bank/{job_id}/error.json"
            s3_client.put_object(
                Bucket=BANK_RESULTS_BUCKET,
                Key=error_key,
                Body=json.dumps({
                    "error": result.get("error", "Unknown error"),
                    "warnings": result.get("warnings", []),
                }).encode("utf-8"),
                ContentType="application/json",
            )
            return response(400, {
                "success": False,
                "error": result.get("error"),
                "warnings": result.get("warnings", []),
            })

        # Save CSV result
        output_key = f"bank/{job_id}/output_{output_format}.csv"
        s3_client.put_object(
            Bucket=BANK_RESULTS_BUCKET,
            Key=output_key,
            Body=result["csv_content"].encode("utf-8"),
            ContentType="text/csv",
            Metadata={
                "job-id": job_id,
                "format": output_format,
                "bank": result["metadata"].get("detected_bank", "unknown"),
            },
        )

        # Save metadata
        meta_key = f"bank/{job_id}/metadata.json"
        s3_client.put_object(
            Bucket=BANK_RESULTS_BUCKET,
            Key=meta_key,
            Body=json.dumps(result["metadata"]).encode("utf-8"),
            ContentType="application/json",
        )

        logger.info(f"Bank job {job_id} processed successfully")

        return response(200, {
            "success": True,
            "jobId": job_id,
            "transactionCount": result["metadata"].get("transaction_count", 0),
            "detectedBank": result["metadata"].get("detected_bank"),
            "warnings": result.get("warnings", []),
            "outputFormat": output_format,
        })

    except ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchKey":
            return response(404, {"error": "PDF file not found"})
        logger.error(f"S3 error processing bank statement: {e}")
        return response(500, {"error": "Storage error"})
    except Exception as e:
        logger.exception(f"Error processing bank statement: {e}")
        return response(500, {"error": f"Processing failed: {str(e)}"})


def handle_bank_job_status(event: Dict) -> Dict:
    """
    Get bank statement job status.

    Path: GET /bank/job/{jobId}
    """
    path_params = event.get("pathParameters", {}) or {}
    job_id = path_params.get("jobId")

    if not job_id:
        return response(400, {"error": "jobId is required"})

    try:
        # Check for metadata (indicates completed)
        meta_key = f"bank/{job_id}/metadata.json"
        try:
            meta_response = s3_client.get_object(Bucket=BANK_RESULTS_BUCKET, Key=meta_key)
            metadata = json.loads(meta_response["Body"].read().decode("utf-8"))

            return response(200, {
                "status": "completed",
                "jobId": job_id,
                "metadata": metadata,
            })
        except ClientError as e:
            if e.response["Error"]["Code"] != "NoSuchKey":
                raise

        # Check for error
        error_key = f"bank/{job_id}/error.json"
        try:
            error_response = s3_client.get_object(Bucket=BANK_RESULTS_BUCKET, Key=error_key)
            error_data = json.loads(error_response["Body"].read().decode("utf-8"))

            return response(200, {
                "status": "failed",
                "jobId": job_id,
                "error": error_data.get("error"),
                "warnings": error_data.get("warnings", []),
            })
        except ClientError as e:
            if e.response["Error"]["Code"] != "NoSuchKey":
                raise

        # Job not found
        return response(404, {"error": "Job not found"})

    except Exception as e:
        logger.error(f"Error getting bank job status: {e}")
        return response(500, {"error": "Failed to get job status"})


def handle_bank_download(event: Dict) -> Dict:
    """
    Get presigned download URL for bank statement result.

    Path: GET /bank/job/{jobId}/download?format=qbo
    """
    path_params = event.get("pathParameters", {}) or {}
    job_id = path_params.get("jobId")
    query_params = event.get("queryStringParameters", {}) or {}
    output_format = query_params.get("format", "qbo")

    if not job_id:
        return response(400, {"error": "jobId is required"})

    try:
        output_key = f"bank/{job_id}/output_{output_format}.csv"

        # Verify file exists
        try:
            s3_client.head_object(Bucket=BANK_RESULTS_BUCKET, Key=output_key)
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return response(404, {"error": f"Output file not found for format: {output_format}"})
            raise

        # Generate presigned download URL
        download_url = s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": BANK_RESULTS_BUCKET,
                "Key": output_key,
                "ResponseContentDisposition": f'attachment; filename="bank_{job_id}_{output_format}.csv"',
                "ResponseContentType": "text/csv",
            },
            ExpiresIn=DOWNLOAD_EXPIRATION,
        )

        logger.info(f"Generated bank download URL for job {job_id}")

        return response(200, {
            "downloadUrl": download_url,
            "expiresIn": DOWNLOAD_EXPIRATION,
            "format": output_format,
        })

    except Exception as e:
        logger.error(f"Error generating bank download URL: {e}")
        return response(500, {"error": "Failed to generate download URL"})


def handle_delete_job(event: Dict) -> Dict:
    """
    Delete all files associated with a job.
    Called when user opts for "Delete after download".

    Path: DELETE /delete/{jobId}

    Response:
    {
        "success": true,
        "jobId": "uuid",
        "deletedFiles": ["uploads/...", "results/..."]
    }
    """
    path_params = event.get("pathParameters", {}) or {}
    job_id = path_params.get("jobId")

    if not job_id:
        return response(400, {"error": "jobId is required"})

    deleted_files = []
    errors = []

    try:
        # Delete from uploads bucket
        try:
            upload_result = s3_client.list_objects_v2(
                Bucket=UPLOADS_BUCKET,
                Prefix=f"uploads/{job_id}/",
            )
            for obj in upload_result.get("Contents", []):
                s3_client.delete_object(Bucket=UPLOADS_BUCKET, Key=obj["Key"])
                deleted_files.append(obj["Key"])
                logger.info(f"Deleted upload file: {obj['Key']}")
        except ClientError as e:
            errors.append(f"Upload deletion error: {e}")
            logger.error(f"Error deleting uploads for job {job_id}: {e}")

        # Delete from results bucket
        try:
            result_result = s3_client.list_objects_v2(
                Bucket=RESULTS_BUCKET,
                Prefix=f"results/{job_id}/",
            )
            for obj in result_result.get("Contents", []):
                s3_client.delete_object(Bucket=RESULTS_BUCKET, Key=obj["Key"])
                deleted_files.append(obj["Key"])
                logger.info(f"Deleted result file: {obj['Key']}")
        except ClientError as e:
            errors.append(f"Results deletion error: {e}")
            logger.error(f"Error deleting results for job {job_id}: {e}")

        logger.info(f"Job {job_id} deleted: {len(deleted_files)} files removed")

        return response(200, {
            "success": True,
            "jobId": job_id,
            "deletedFiles": deleted_files,
            "errors": errors if errors else None,
        })

    except Exception as e:
        logger.error(f"Error deleting job {job_id}: {e}")
        return response(500, {"error": "Failed to delete job files"})


def handle_list_banks(event: Dict) -> Dict:
    """
    List supported banks.

    Path: GET /bank/banks
    """
    try:
        try:
            from services.bank_statement import BankStatementProcessor
        except ImportError:
            from bank_statement import BankStatementProcessor

        processor = BankStatementProcessor()
        banks = processor.get_supported_banks()
        formats = processor.get_supported_formats()

        return response(200, {
            "banks": banks,
            "formats": formats,
        })

    except ImportError:
        # Return hardcoded list if module not available
        return response(200, {
            "banks": [
                {"id": "chase", "name": "Chase"},
                {"id": "bank_of_america", "name": "Bank of America"},
                {"id": "wells_fargo", "name": "Wells Fargo"},
                {"id": "citi", "name": "Citi"},
            ],
            "formats": [
                {"id": "qbo", "name": "QuickBooks Online"},
                {"id": "xero", "name": "Xero"},
                {"id": "excel", "name": "Excel/Generic"},
            ],
        })

    except Exception as e:
        logger.error(f"Error listing banks: {e}")
        return response(500, {"error": "Failed to list supported banks"})


def handler(event: Dict, context: Any) -> Dict:
    """
    Main Lambda handler - routes requests to appropriate handlers.
    """
    logger.info(f"Received event: {json.dumps(event)}")

    # Handle OPTIONS preflight
    http_method = event.get("requestContext", {}).get("http", {}).get("method", "")
    if http_method == "OPTIONS":
        return response(200, {})

    # Get route from API Gateway v2 format
    route_key = event.get("routeKey", "")

    # Route to appropriate handler
    if route_key == "POST /presigned-url":
        return handle_presigned_url(event)
    elif route_key == "POST /confirm-upload":
        return handle_confirm_upload(event)
    elif route_key == "GET /job/{jobId}":
        return handle_job_status(event)
    elif route_key == "GET /download/{jobId}":
        return handle_download(event)
    elif route_key == "GET /insights/{jobId}":
        return handle_insights(event)
    elif route_key == "POST /job/{jobId}/retry":
        return handle_job_retry(event)
    elif route_key == "DELETE /delete/{jobId}":
        return handle_delete_job(event)
    elif route_key == "POST /webhook":
        # Generic webhook endpoint (for future use)
        return response(200, {"message": "Webhook received"})
    # Bank statement routes
    elif route_key == "POST /bank/presigned-url":
        return handle_bank_presigned_url(event)
    elif route_key == "POST /bank/process":
        return handle_bank_process(event)
    elif route_key == "GET /bank/job/{jobId}":
        return handle_bank_job_status(event)
    elif route_key == "GET /bank/job/{jobId}/download":
        return handle_bank_download(event)
    elif route_key == "GET /bank/banks":
        return handle_list_banks(event)
    else:
        logger.warning(f"Unknown route: {route_key}")
        return response(404, {"error": f"Route not found: {route_key}"})
