# ses.tf - AWS Simple Email Service configuration

# SES Email Identity (for sender email)
resource "aws_ses_email_identity" "sender" {
  email = var.ses_sender_email
}

# SES Configuration Set
resource "aws_ses_configuration_set" "main" {
  name = "${var.project_name}-${var.environment}-ses-config"

  delivery_options {
    tls_policy = "Require"
  }

  reputation_metrics_enabled = true
  sending_enabled            = true
}

# SES Event Destination - Send bounce/complaint events to CloudWatch
resource "aws_ses_event_destination" "cloudwatch" {
  name                   = "cloudwatch-destination"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true
  matching_types         = ["send", "bounce", "complaint", "delivery", "reject"]

  cloudwatch_destination {
    default_value  = "default"
    dimension_name = "emailType"
    value_source   = "messageTag"
  }
}

# SES Event Destination - Send bounce/complaint events to SNS
resource "aws_ses_event_destination" "sns" {
  name                   = "sns-destination"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true
  matching_types         = ["bounce", "complaint"]

  sns_destination {
    topic_arn = aws_sns_topic.ses_notifications.arn
  }
}

# SNS Topic for SES Bounce/Complaint Notifications
resource "aws_sns_topic" "ses_notifications" {
  name = "${var.project_name}-${var.environment}-ses-notifications"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "ses_notifications_email" {
  topic_arn = aws_sns_topic.ses_notifications.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch Alarm for SES Bounces
resource "aws_cloudwatch_metric_alarm" "ses_bounces" {
  alarm_name          = "${var.project_name}-${var.environment}-ses-bounces"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Reputation.BounceRate"
  namespace           = "AWS/SES"
  period              = 3600
  statistic           = "Average"
  threshold           = 0.05
  alarm_description   = "Alert when SES bounce rate is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  tags = local.common_tags
}

# CloudWatch Alarm for SES Complaints
resource "aws_cloudwatch_metric_alarm" "ses_complaints" {
  alarm_name          = "${var.project_name}-${var.environment}-ses-complaints"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Reputation.ComplaintRate"
  namespace           = "AWS/SES"
  period              = 3600
  statistic           = "Average"
  threshold           = 0.001
  alarm_description   = "Alert when SES complaint rate is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  tags = local.common_tags
}

# Output SES verification status
output "ses_verification_token" {
  description = "SES email identity verification token (check your email)"
  value       = "Check ${var.ses_sender_email} for verification email from AWS SES"
}
