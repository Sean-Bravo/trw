# main.tf - Main Terraform configuration for TaxFormatter Backend
# Uses Neon (external DB), Python 3.12 Lambda

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Uncomment after first apply to enable remote state
  # backend "s3" {
  #   bucket         = "taxformatter-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "taxformatter-terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.tags
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Local values for computed names
locals {
  account_id = data.aws_caller_identity.current.account_id

  # Resource naming
  vpc_name = "${var.project_name}-${var.environment}-vpc"

  # S3 bucket names (must be globally unique)
  uploads_bucket = "${var.project_name}-${var.environment}-uploads-${local.account_id}"
  results_bucket = "${var.project_name}-${var.environment}-results-${local.account_id}"
  lambda_bucket  = "${var.project_name}-${var.environment}-lambda-${local.account_id}"

  # SQS queue names
  processing_queue = "${var.project_name}-${var.environment}-processing"
  processing_dlq   = "${var.project_name}-${var.environment}-processing-dlq"

  # Lambda function names
  webhook_lambda   = "${var.project_name}-${var.environment}-webhook"
  scanner_lambda   = "${var.project_name}-${var.environment}-scanner"
  processor_lambda = "${var.project_name}-${var.environment}-processor"
  api_lambda       = "${var.project_name}-${var.environment}-api"

  # Security group names (kept for potential future use)
  lambda_sg_name = "${var.project_name}-${var.environment}-lambda-sg"

  # Common tags
  common_tags = merge(
    var.tags,
    {
      Name = var.project_name
    }
  )
}

# Outputs for reference
output "uploads_bucket" {
  description = "S3 uploads bucket name"
  value       = aws_s3_bucket.uploads.id
}

output "results_bucket" {
  description = "S3 results bucket name"
  value       = aws_s3_bucket.results.id
}

output "processing_queue_url" {
  description = "SQS processing queue URL"
  value       = aws_sqs_queue.processing.url
}

output "webhook_lambda_function_name" {
  description = "Webhook Lambda function name"
  value       = aws_lambda_function.webhook.function_name
}

output "scanner_lambda_function_name" {
  description = "Scanner Lambda function name"
  value       = aws_lambda_function.scanner.function_name
}

output "processor_lambda_function_name" {
  description = "Processor Lambda function name"
  value       = aws_lambda_function.processor.function_name
}

output "api_lambda_function_name" {
  description = "API Lambda function name"
  value       = aws_lambda_function.api.function_name
}

output "api_gateway_url" {
  description = "API Gateway invoke URL"
  value       = aws_apigatewayv2_stage.prod.invoke_url
}

output "secrets_arn" {
  description = "Secrets Manager ARN for app secrets"
  value       = aws_secretsmanager_secret.app_secrets.arn
  sensitive   = true
}
