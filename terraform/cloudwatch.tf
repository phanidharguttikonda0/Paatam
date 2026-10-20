# ==========================================================
# CloudWatch Logs, Alarms & EventBridge Scheduler for HLD
# ==========================================================

# ==========================================================
# 1. CloudWatch Log Groups for All Worker Lambdas
# ==========================================================

resource "aws_cloudwatch_log_group" "assignment_ocr_logs" {
  name              = "/aws/lambda/${aws_lambda_function.assignment_ocr.function_name}"
  retention_in_days = 14

  tags = {
    Environment = var.environment
    Service     = "assignment-ocr"
  }
}

resource "aws_cloudwatch_log_group" "bulk_split_logs" {
  name              = "/aws/lambda/${aws_lambda_function.bulk_split.function_name}"
  retention_in_days = 14

  tags = {
    Environment = var.environment
    Service     = "bulk-split"
  }
}

resource "aws_cloudwatch_log_group" "paper_ocr_logs" {
  name              = "/aws/lambda/${aws_lambda_function.paper_ocr.function_name}"
  retention_in_days = 14

  tags = {
    Environment = var.environment
    Service     = "paper-ocr"
  }
}

resource "aws_cloudwatch_log_group" "paper_evaluation_logs" {
  name              = "/aws/lambda/${aws_lambda_function.paper_evaluation.function_name}"
  retention_in_days = 14

  tags = {
    Environment = var.environment
    Service     = "paper-evaluation"
  }
}

resource "aws_cloudwatch_log_group" "sweeper_logs" {
  name              = "/aws/lambda/${aws_lambda_function.sweeper.function_name}"
  retention_in_days = 14

  tags = {
    Environment = var.environment
    Service     = "sweeper"
  }
}

# ==========================================================
# 2. EventBridge Scheduler (Cron) for Sweeper Lambda
# ==========================================================

resource "aws_cloudwatch_event_rule" "sweeper_schedule" {
  name                = "paatam-sweeper-schedule-${var.environment}"
  description         = "Triggers Sweeper Lambda every 15 minutes to rescue stuck AI evaluation jobs"
  schedule_expression = "rate(15 minutes)"

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_target" "sweeper_target" {
  rule      = aws_cloudwatch_event_rule.sweeper_schedule.name
  target_id = "sweeper-lambda"
  arn       = aws_lambda_function.sweeper.arn
}

resource "aws_lambda_permission" "allow_eventbridge_sweeper" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sweeper.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.sweeper_schedule.arn
}

# ==========================================================
# 3. CloudWatch Metric Alarms (Operations & Monitoring)
# ==========================================================

# Alarm 1: DLQ Depth Alarm (Fires if ANY message enters the Dead-Letter Queues)
resource "aws_cloudwatch_metric_alarm" "paper_ocr_dlq_alarm" {
  alarm_name          = "paatam-paper-ocr-dlq-alarm-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1
  alarm_description   = "Fires when handwritten OCR jobs fail 3 times and enter the DLQ"

  dimensions = {
    QueueName = aws_sqs_queue.paper_ocr_dlq.name
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "paper_evaluation_dlq_alarm" {
  alarm_name          = "paatam-paper-evaluation-dlq-alarm-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1
  alarm_description   = "Fires when grading evaluation jobs fail 3 times and enter the DLQ"

  dimensions = {
    QueueName = aws_sqs_queue.paper_evaluation_dlq.name
  }

  tags = {
    Environment = var.environment
  }
}

# Alarm 2: Lambda Errors Alarm
resource "aws_cloudwatch_metric_alarm" "lambda_errors_alarm" {
  alarm_name          = "paatam-lambda-errors-alarm-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Fires when Lambda workers encounter continuous runtime errors"

  tags = {
    Environment = var.environment
  }
}
