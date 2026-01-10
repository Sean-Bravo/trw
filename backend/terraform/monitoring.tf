# monitoring.tf - CloudWatch monitoring and SNS alerts

# ===== SNS TOPIC FOR ALERTS =====

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-${var.environment}-alerts"
    }
  )
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ===== LAMBDA CLOUDWATCH ALARMS =====

# Webhook Lambda Errors
resource "aws_cloudwatch_metric_alarm" "webhook_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-webhook-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Alert when webhook Lambda has errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.webhook.function_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "webhook_throttles" {
  alarm_name          = "${var.project_name}-${var.environment}-webhook-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when webhook Lambda is throttled"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.webhook.function_name
  }

  tags = local.common_tags
}

# Scanner Lambda Errors
resource "aws_cloudwatch_metric_alarm" "scanner_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-scanner-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Alert when scanner Lambda has errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.scanner.function_name
  }

  tags = local.common_tags
}

# Processor Lambda Errors
resource "aws_cloudwatch_metric_alarm" "processor_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-processor-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Alert when processor Lambda has errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.processor.function_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "processor_duration" {
  alarm_name          = "${var.project_name}-${var.environment}-processor-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  threshold           = 600000
  alarm_description   = "Alert when processor Lambda duration is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.processor.function_name
  }

  tags = local.common_tags
}

# ===== CLOUDWATCH DASHBOARD =====

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", "${var.project_name}-${var.environment}-webhook", { stat = "Sum", label = "Webhook" }],
            ["AWS/Lambda", "Invocations", "FunctionName", "${var.project_name}-${var.environment}-scanner", { stat = "Sum", label = "Scanner" }],
            ["AWS/Lambda", "Invocations", "FunctionName", "${var.project_name}-${var.environment}-processor", { stat = "Sum", label = "Processor" }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Lambda Invocations"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", "${var.project_name}-${var.environment}-webhook", { stat = "Sum", label = "Webhook" }],
            ["AWS/Lambda", "Errors", "FunctionName", "${var.project_name}-${var.environment}-scanner", { stat = "Sum", label = "Scanner" }],
            ["AWS/Lambda", "Errors", "FunctionName", "${var.project_name}-${var.environment}-processor", { stat = "Sum", label = "Processor" }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Lambda Errors"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", "${var.project_name}-${var.environment}-processing", { stat = "Average", label = "Processing Queue" }],
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", "${var.project_name}-${var.environment}-processing-dlq", { stat = "Average", label = "DLQ" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "SQS Queue Depth"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", "${var.project_name}-${var.environment}-processor", { stat = "Average", label = "Processor Duration" }],
            ["AWS/Lambda", "Duration", "FunctionName", "${var.project_name}-${var.environment}-webhook", { stat = "Average", label = "Webhook Duration" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Lambda Duration (ms)"
        }
      }
    ]
  })
}

# ===== CLOUDWATCH LOG INSIGHTS QUERIES =====

resource "aws_cloudwatch_query_definition" "lambda_errors" {
  name = "${var.project_name}-lambda-errors"

  log_group_names = [
    aws_cloudwatch_log_group.webhook.name,
    aws_cloudwatch_log_group.scanner.name,
    aws_cloudwatch_log_group.processor.name
  ]

  query_string = <<-QUERY
    fields @timestamp, @message
    | filter @message like /ERROR/
    | sort @timestamp desc
    | limit 50
  QUERY
}

resource "aws_cloudwatch_query_definition" "slow_queries" {
  name = "${var.project_name}-slow-database-queries"

  log_group_names = [
    aws_cloudwatch_log_group.processor.name
  ]

  query_string = <<-QUERY
    fields @timestamp, @message
    | filter @message like /duration:/
    | parse @message /duration: (?<duration>\d+)/
    | filter duration > 1000
    | sort duration desc
    | limit 20
  QUERY
}
