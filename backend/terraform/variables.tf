# variables.tf - Define all input variables for the Terraform configuration
# Uses Neon DATABASE_URL, Python 3.12 Lambda

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "taxformatter"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

# Database Configuration - Neon (external)
variable "database_url" {
  description = "Neon PostgreSQL connection string"
  type        = string
  sensitive   = true
}

# Application Secrets
variable "nextauth_secret" {
  description = "NextAuth JWT signing secret"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic Claude API key"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key (optional fallback)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_gemini_api_key" {
  description = "Google Gemini API key (optional for free tier)"
  type        = string
  sensitive   = true
  default     = ""
}

# Email Configuration
variable "alert_email" {
  description = "Email address for CloudWatch alerts"
  type        = string
}

variable "ses_sender_email" {
  description = "Email address for sending notifications via SES"
  type        = string
}

# Domain Configuration
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "taxformatter.com"
}

# Lambda Configuration - Python 3.12
variable "lambda_runtime" {
  description = "Python runtime for Lambda functions"
  type        = string
  default     = "python3.12"
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 900  # 15 minutes for processor
}

variable "lambda_memory_size" {
  description = "Lambda function memory in MB"
  type        = number
  default     = 512
}

# S3 Configuration
variable "s3_lifecycle_days" {
  description = "Days before moving S3 objects to cheaper storage"
  type        = number
  default     = 30
}

variable "s3_expiration_days" {
  description = "Days before deleting old S3 objects (1 year retention)"
  type        = number
  default     = 365
}

# Monitoring Configuration
variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention in days"
  type        = number
  default     = 30
}

# Tags
variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "TaxFormatter"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}
