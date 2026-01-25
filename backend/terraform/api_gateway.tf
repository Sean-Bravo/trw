# api_gateway.tf - API Gateway HTTP API for webhook Lambda

# API Gateway HTTP API
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-${var.environment}-api"
  protocol_type = "HTTP"
  description   = "TaxFormatter API Gateway"

  cors_configuration {
    allow_origins = [
      "https://${var.domain_name}",
      "https://www.${var.domain_name}",
      "http://localhost:3000"
    ]
    allow_methods = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS"
    ]
    allow_headers = [
      "content-type",
      "x-amz-date",
      "authorization",
      "x-api-key",
      "x-amz-security-token",
      "x-amz-user-agent"
    ]
    max_age = 300
  }

  tags = local.common_tags
}

# API Gateway Stage
resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "prod"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      errorMessage   = "$context.error.message"
    })
  }

  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }

  tags = local.common_tags
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

# Lambda Integration
resource "aws_apigatewayv2_integration" "webhook" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.webhook.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

# Routes
resource "aws_apigatewayv2_route" "webhook_post" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /webhook"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

resource "aws_apigatewayv2_route" "presigned_url" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /presigned-url"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

resource "aws_apigatewayv2_route" "confirm_upload" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /confirm-upload"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

resource "aws_apigatewayv2_route" "download_url" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /download/{jobId}"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

resource "aws_apigatewayv2_route" "job_status" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /job/{jobId}"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

resource "aws_apigatewayv2_route" "insights" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /insights/{jobId}"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

resource "aws_apigatewayv2_route" "job_retry" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /job/{jobId}/retry"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

resource "aws_apigatewayv2_route" "delete_job" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "DELETE /delete/{jobId}"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

# ===== Bank Statement Routes =====

resource "aws_apigatewayv2_route" "bank_presigned_url" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /bank/presigned-url"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

resource "aws_apigatewayv2_route" "bank_process" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /bank/process"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

resource "aws_apigatewayv2_route" "bank_job_status" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /bank/job/{jobId}"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

resource "aws_apigatewayv2_route" "bank_job_download" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /bank/job/{jobId}/download"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

resource "aws_apigatewayv2_route" "bank_list" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /bank/banks"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

# Lambda Permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.webhook.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# API Gateway Alarm - 5XX Errors
resource "aws_cloudwatch_metric_alarm" "api_gateway_5xx" {
  alarm_name          = "${var.project_name}-${var.environment}-api-gateway-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Alert when API Gateway has 5XX errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiId = aws_apigatewayv2_api.main.id
    Stage = aws_apigatewayv2_stage.prod.name
  }

  tags = local.common_tags
}

# API Gateway Alarm - 4XX Errors (rate limiting)
resource "aws_cloudwatch_metric_alarm" "api_gateway_4xx" {
  alarm_name          = "${var.project_name}-${var.environment}-api-gateway-4xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "Alert when API Gateway has many 4XX errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiId = aws_apigatewayv2_api.main.id
    Stage = aws_apigatewayv2_stage.prod.name
  }

  tags = local.common_tags
}

# =============================================================================
# Custom Domain: api.taxformatter.com
# =============================================================================

# ACM Certificate for api.taxformatter.com
resource "aws_acm_certificate" "api" {
  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name = "api.${var.domain_name}"
  })
}

# Certificate validation DNS records (output for manual creation in DNS provider)
output "api_certificate_validation" {
  description = "DNS validation records for ACM certificate"
  value = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      value  = dvo.resource_record_value
    }
  }
}

# Wait for certificate validation
resource "aws_acm_certificate_validation" "api" {
  certificate_arn = aws_acm_certificate.api.arn

  timeouts {
    create = "30m"
  }
}

# API Gateway Custom Domain
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.${var.domain_name}"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.api.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  tags = local.common_tags
}

# Map custom domain to API Gateway stage
resource "aws_apigatewayv2_api_mapping" "api" {
  api_id      = aws_apigatewayv2_api.main.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.prod.id
}

# Output the target domain name for DNS CNAME record
output "api_domain_target" {
  description = "Target domain for CNAME record (api.taxformatter.com -> this value)"
  value       = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
}

output "api_custom_domain" {
  description = "Custom API domain"
  value       = "https://api.${var.domain_name}"
}
