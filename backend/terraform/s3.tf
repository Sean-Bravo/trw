# s3.tf - S3 buckets for uploads, results, and Lambda deployment

# ===== UPLOADS BUCKET =====

resource "aws_s3_bucket" "uploads" {
  bucket = local.uploads_bucket

  tags = merge(
    local.common_tags,
    {
      Name    = local.uploads_bucket
      Purpose = "User CSV file uploads"
    }
  )
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Suspended" # retention policy: deletes must be real deletes
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  # Retention policy: everything deleted within 30 days. S3 evaluates
  # expiration once a day at UTC midnight, so 29 keeps "within 30" true.
  rule {
    id     = "expire-29d"
    status = "Enabled"
    filter {}

    expiration {
      days = 29
    }

    noncurrent_version_expiration {
      noncurrent_days = 1 # flush versions left from when versioning was on
    }
  }

  rule {
    id     = "cleanup-delete-markers"
    status = "Enabled"
    filter {}

    expiration {
      expired_object_delete_marker = true
    }
  }

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"
    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST"]
    allowed_origins = [
      "https://${var.domain_name}",
      "https://www.${var.domain_name}",
      "http://localhost:3000"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ===== RESULTS BUCKET =====

resource "aws_s3_bucket" "results" {
  bucket = local.results_bucket

  tags = merge(
    local.common_tags,
    {
      Name    = local.results_bucket
      Purpose = "Processed CSV files for download"
    }
  )
}

resource "aws_s3_bucket_versioning" "results" {
  bucket = aws_s3_bucket.results.id

  versioning_configuration {
    status = "Suspended" # retention policy: deletes must be real deletes
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "results" {
  bucket = aws_s3_bucket.results.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "results" {
  bucket = aws_s3_bucket.results.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "results" {
  bucket = aws_s3_bucket.results.id

  # Retention policy: everything deleted within 30 days. S3 evaluates
  # expiration once a day at UTC midnight, so 29 keeps "within 30" true.
  rule {
    id     = "expire-29d"
    status = "Enabled"
    filter {}

    expiration {
      days = 29
    }

    noncurrent_version_expiration {
      noncurrent_days = 1 # flush versions left from when versioning was on
    }
  }

  rule {
    id     = "cleanup-delete-markers"
    status = "Enabled"
    filter {}

    expiration {
      expired_object_delete_marker = true
    }
  }

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"
    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "results" {
  bucket = aws_s3_bucket.results.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = [
      "https://${var.domain_name}",
      "https://www.${var.domain_name}",
      "http://localhost:3000"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ===== LAMBDA DEPLOYMENT BUCKET =====

resource "aws_s3_bucket" "lambda" {
  bucket = local.lambda_bucket

  tags = merge(
    local.common_tags,
    {
      Name    = local.lambda_bucket
      Purpose = "Lambda function deployment packages"
    }
  )
}

resource "aws_s3_bucket_versioning" "lambda" {
  bucket = aws_s3_bucket.lambda.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "lambda" {
  bucket = aws_s3_bucket.lambda.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "lambda" {
  bucket = aws_s3_bucket.lambda.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ===== S3 EVENT NOTIFICATIONS =====

# Lambda permission for S3 to invoke scanner
resource "aws_lambda_permission" "s3_invoke_scanner" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scanner.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.uploads.arn
}

# S3 notification to trigger scanner on upload
resource "aws_s3_bucket_notification" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.scanner.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
  }

  depends_on = [aws_lambda_permission.s3_invoke_scanner]
}
