# sqs.tf - SQS queues for asynchronous processing

# Dead Letter Queue (DLQ) for failed messages
resource "aws_sqs_queue" "processing_dlq" {
  name                       = local.processing_dlq
  message_retention_seconds  = 1209600  # 14 days
  visibility_timeout_seconds = 300

  tags = merge(
    local.common_tags,
    {
      Name    = local.processing_dlq
      Purpose = "Dead letter queue for failed processing jobs"
    }
  )
}

# Main Processing Queue
resource "aws_sqs_queue" "processing" {
  name                       = local.processing_queue
  message_retention_seconds  = 345600   # 4 days
  visibility_timeout_seconds = 960      # 16 minutes (slightly more than Lambda timeout)
  delay_seconds              = 0
  max_message_size           = 262144   # 256 KB
  receive_wait_time_seconds  = 20       # Long polling

  # Redrive policy for DLQ
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.processing_dlq.arn
    maxReceiveCount     = 3
  })

  tags = merge(
    local.common_tags,
    {
      Name    = local.processing_queue
      Purpose = "Main queue for CSV processing jobs"
    }
  )
}

# SQS Queue Policy - Allow Lambda to send messages
resource "aws_sqs_queue_policy" "processing" {
  queue_url = aws_sqs_queue.processing.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.processing.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = [
              aws_lambda_function.scanner.arn,
              aws_lambda_function.processor.arn
            ]
          }
        }
      }
    ]
  })
}

# Lambda Event Source Mapping - Connect SQS to Processor Lambda
resource "aws_lambda_event_source_mapping" "sqs_to_processor" {
  event_source_arn = aws_sqs_queue.processing.arn
  function_name    = aws_lambda_function.processor.function_name
  batch_size       = 1
  enabled          = true

  scaling_config {
    maximum_concurrency = 10
  }

  function_response_types = ["ReportBatchItemFailures"]

  depends_on = [aws_iam_role_policy_attachment.processor_sqs]
}

# CloudWatch Alarm for DLQ messages
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "${var.project_name}-${var.environment}-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "Alert when messages appear in DLQ"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.processing_dlq.name
  }

  tags = local.common_tags
}

# CloudWatch Alarm for Queue Depth
resource "aws_cloudwatch_metric_alarm" "queue_depth" {
  alarm_name          = "${var.project_name}-${var.environment}-queue-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 100
  alarm_description   = "Alert when processing queue depth is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.processing.name
  }

  tags = local.common_tags
}
