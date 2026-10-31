# ==========================================================
# Paatam Observability & Monitoring (AMP, X-Ray, CloudWatch Alarms)
# ==========================================================

# ==========================================
# 1. AWS Managed Prometheus (AMP) Workspace
# ==========================================
resource "aws_prometheus_workspace" "main" {
  alias = "paatam-amp-${var.environment}"

  tags = {
    Name        = "paatam-amp-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# ==========================================
# 2. IAM Policies for ECS Task Role (X-Ray & Prometheus)
# ==========================================
# Allows ADOT sidecar and backend in ECS to push traces to X-Ray
resource "aws_iam_role_policy_attachment" "ecs_xray_write" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXrayWriteOnlyAccess"
}

# Allows ADOT sidecar to remote-write metrics to AWS Managed Prometheus
resource "aws_iam_role_policy_attachment" "ecs_amp_remote_write" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonPrometheusRemoteWriteAccess"
}

# Allows ADOT sidecar to write CloudWatch Container Insights metrics
resource "aws_iam_role_policy_attachment" "ecs_cw_agent" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# ==========================================
# 3. CloudWatch Alarms for SQS Dead Letter Queues (DLQ)
# ==========================================
# Guarantee that ANY failed job in background AI pipelines is caught immediately
resource "aws_cloudwatch_metric_alarm" "assignment_ocr_dlq_alarm" {
  alarm_name          = "paatam-assignment-ocr-dlq-alarm-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1
  alarm_description   = "CRITICAL: Assignment ingestion jobs failed 3 retries and entered DLQ"

  dimensions = {
    QueueName = aws_sqs_queue.assignment_ocr_dlq.name
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "bulk_split_dlq_alarm" {
  alarm_name          = "paatam-bulk-split-dlq-alarm-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1
  alarm_description   = "CRITICAL: Bulk 35-student PDF splitting failed 3 retries and entered DLQ"

  dimensions = {
    QueueName = aws_sqs_queue.bulk_split_dlq.name
  }

  tags = {
    Environment = var.environment
  }
}

# ==========================================
# 4. Database (RDS) Saturation & Health Alarms
# ==========================================
resource "aws_cloudwatch_metric_alarm" "rds_high_connections" {
  alarm_name          = "paatam-rds-connections-alarm-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 80
  alarm_description   = "WARNING: PostgreSQL database connections approaching pool limits"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "paatam-rds-cpu-alarm-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80.0
  alarm_description   = "CRITICAL: RDS PostgreSQL CPU utilization sustained above 80%"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  tags = {
    Environment = var.environment
  }
}

# ==========================================
# 5. Amazon Managed Grafana (AMG) Workspace & Role
# ==========================================
resource "aws_iam_role" "grafana_role" {
  name = "paatam-grafana-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "grafana.amazonaws.com"
      }
    }]
  })

  tags = {
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "grafana_cloudwatch" {
  role       = aws_iam_role.grafana_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess"
}

resource "aws_iam_role_policy_attachment" "grafana_prometheus" {
  role       = aws_iam_role.grafana_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonPrometheusQueryAccess"
}

resource "aws_iam_role_policy_attachment" "grafana_xray" {
  role       = aws_iam_role.grafana_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXrayReadOnlyAccess"
}

# Note: Amazon Managed Grafana (AMG) requires AWS SSO (IAM Identity Center) and is available 
# in select regions (e.g. ap-southeast-1 or us-east-1). 
# Once SSO is enabled or self-hosted Grafana is deployed, uncomment this block.
# resource "aws_grafana_workspace" "main" {
#   name                     = "paatam-grafana-${var.environment}"
#   account_access_type      = "CURRENT_ACCOUNT"
#   authentication_providers = ["AWS_SSO"]
#   permission_type          = "SERVICE_MANAGED"
#   role_arn                 = aws_iam_role.grafana_role.arn
#   data_sources             = ["CLOUDWATCH", "PROMETHEUS", "XRAY"]
# 
#   tags = {
#     Name        = "paatam-grafana-${var.environment}"
#     Environment = var.environment
#     ManagedBy   = "Terraform"
#   }
# }
