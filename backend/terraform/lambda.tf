# lambda.tf - Lambda functions for webhook, scanner, and CSV processor
# Python 3.12, uses Neon (external DB)

# ===== SECRETS MANAGER =====

# Application secrets for Lambda functions (includes DATABASE_URL for Neon)
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${var.project_name}/${var.environment}/app-secrets"
  description             = "Application secrets for Lambda functions"
  recovery_window_in_days = 7

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    ANTHROPIC_API_KEY     = var.anthropic_api_key
    OPENAI_API_KEY        = var.openai_api_key
    GOOGLE_GEMINI_API_KEY = var.google_gemini_api_key
    NEXTAUTH_SECRET       = var.nextauth_secret
    SES_SENDER_EMAIL      = var.ses_sender_email
    DATABASE_URL          = var.database_url
  })
}

# ===== LAMBDA EXECUTION ROLES =====

# Webhook Lambda Role
resource "aws_iam_role" "webhook" {
  name = "${var.project_name}-${var.environment}-webhook-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# Scanner Lambda Role
resource "aws_iam_role" "scanner" {
  name = "${var.project_name}-${var.environment}-scanner-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# Processor Lambda Role
resource "aws_iam_role" "processor" {
  name = "${var.project_name}-${var.environment}-processor-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# ===== IAM POLICY ATTACHMENTS =====

# Basic Lambda execution role (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "webhook_basic" {
  role       = aws_iam_role.webhook.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "webhook" {
  name = "${var.project_name}-${var.environment}-webhook-policy"
  role = aws_iam_role.webhook.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:HeadObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.uploads.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:HeadObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.results.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.results.arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.app_secrets.arn
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.processing.arn
      }
    ]
  })
}

# Scanner Lambda Policies
resource "aws_iam_role_policy_attachment" "scanner_basic" {
  role       = aws_iam_role.scanner.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "scanner" {
  name = "${var.project_name}-${var.environment}-scanner-policy"
  role = aws_iam_role.scanner.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObjectTagging"
        ]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.processing.arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.app_secrets.arn
      }
    ]
  })
}

# Processor Lambda Policies
resource "aws_iam_role_policy_attachment" "processor_basic" {
  role       = aws_iam_role.processor.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "processor" {
  name = "${var.project_name}-${var.environment}-processor-policy"
  role = aws_iam_role.processor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.results.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.processing.arn
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.processing_dlq.arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.app_secrets.arn
      },
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "processor_sqs" {
  role       = aws_iam_role.processor.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole"
}

# ===== CLOUDWATCH LOG GROUPS =====

resource "aws_cloudwatch_log_group" "webhook" {
  name              = "/aws/lambda/${local.webhook_lambda}"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "scanner" {
  name              = "/aws/lambda/${local.scanner_lambda}"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "processor" {
  name              = "/aws/lambda/${local.processor_lambda}"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

# ===== LAMBDA FUNCTIONS =====
# Python 3.12, no VPC - Lambdas connect directly to Neon (public internet)

# Webhook Lambda Function
resource "aws_lambda_function" "webhook" {
  filename         = "${path.module}/lambda_placeholder.zip"
  function_name    = local.webhook_lambda
  role             = aws_iam_role.webhook.arn
  handler          = "webhook.handler"
  runtime          = var.lambda_runtime
  timeout          = 60
  memory_size      = var.lambda_memory_size
  source_code_hash = filebase64sha256("${path.module}/lambda_placeholder.zip")

  environment {
    variables = {
      ENVIRONMENT         = var.environment
      UPLOADS_BUCKET      = aws_s3_bucket.uploads.id
      RESULTS_BUCKET      = aws_s3_bucket.results.id
      SECRETS_ARN         = aws_secretsmanager_secret.app_secrets.arn
      PROCESSOR_QUEUE_URL = aws_sqs_queue.processing.url
    }
  }

  tags = merge(
    local.common_tags,
    {
      Name = local.webhook_lambda
    }
  )

  depends_on = [
    aws_cloudwatch_log_group.webhook,
    aws_iam_role_policy_attachment.webhook_basic
  ]

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
    ]
  }
}

# Scanner Lambda Function
resource "aws_lambda_function" "scanner" {
  filename         = "${path.module}/lambda_placeholder.zip"
  function_name    = local.scanner_lambda
  role             = aws_iam_role.scanner.arn
  handler          = "scanner.handler"
  runtime          = var.lambda_runtime
  timeout          = 300
  memory_size      = 1024
  source_code_hash = filebase64sha256("${path.module}/lambda_placeholder.zip")

  environment {
    variables = {
      ENVIRONMENT      = var.environment
      UPLOADS_BUCKET   = aws_s3_bucket.uploads.id
      PROCESSING_QUEUE = aws_sqs_queue.processing.url
      SECRETS_ARN      = aws_secretsmanager_secret.app_secrets.arn
    }
  }

  tags = merge(
    local.common_tags,
    {
      Name = local.scanner_lambda
    }
  )

  depends_on = [
    aws_cloudwatch_log_group.scanner,
    aws_iam_role_policy_attachment.scanner_basic
  ]

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
    ]
  }
}

# Processor Lambda Function
resource "aws_lambda_function" "processor" {
  filename         = "${path.module}/lambda_placeholder.zip"
  function_name    = local.processor_lambda
  role             = aws_iam_role.processor.arn
  handler          = "processor.handler"
  runtime          = var.lambda_runtime
  timeout          = var.lambda_timeout
  memory_size      = 2048
  source_code_hash = filebase64sha256("${path.module}/lambda_placeholder.zip")

  environment {
    variables = {
      ENVIRONMENT    = var.environment
      UPLOADS_BUCKET = aws_s3_bucket.uploads.id
      RESULTS_BUCKET = aws_s3_bucket.results.id
      SECRETS_ARN    = aws_secretsmanager_secret.app_secrets.arn
    }
  }

  tags = merge(
    local.common_tags,
    {
      Name = local.processor_lambda
    }
  )

  depends_on = [
    aws_cloudwatch_log_group.processor,
    aws_iam_role_policy_attachment.processor_basic
  ]

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
    ]
  }
}

# ===== LAMBDA EVENT CONFIG =====

resource "aws_lambda_function_event_invoke_config" "processor" {
  function_name                = aws_lambda_function.processor.function_name
  maximum_event_age_in_seconds = 3600
  maximum_retry_attempts       = 2

  destination_config {
    on_failure {
      destination = aws_sqs_queue.processing_dlq.arn
    }
  }
}

# ===== SQS TRIGGER FOR PROCESSOR =====

resource "aws_lambda_event_source_mapping" "processor_sqs" {
  event_source_arn = aws_sqs_queue.processing.arn
  function_name    = aws_lambda_function.processor.arn
  batch_size       = 1
  enabled          = true
}
