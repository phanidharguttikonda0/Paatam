# ==========================================================
# AWS SQS Queues & Dead-Letter Queues (DLQ) for AI Pipeline
# ==========================================================

# ----------------------------------------------------------
# 1. Assignment Ingestion & OCR Queue
# ----------------------------------------------------------
resource "aws_sqs_queue" "assignment_ocr_dlq" {
  name                      = "paatam-assignment-ocr-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_sqs_queue" "assignment_ocr_queue" {
  name                       = "paatam-assignment-ocr-queue-${var.environment}"
  visibility_timeout_seconds = 900 # 15 minutes (matches Lambda timeout)
  message_retention_seconds  = 86400 # 1 day

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.assignment_ocr_dlq.arn
    maxReceiveCount     = 3
  })
}

# ----------------------------------------------------------
# 2. Bulk Answer Sheet Stack Splitting Queue
# ----------------------------------------------------------
resource "aws_sqs_queue" "bulk_split_dlq" {
  name                      = "paatam-bulk-split-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_sqs_queue" "bulk_split_queue" {
  name                       = "paatam-bulk-split-queue-${var.environment}"
  visibility_timeout_seconds = 900 # 15 minutes
  message_retention_seconds  = 86400

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.bulk_split_dlq.arn
    maxReceiveCount     = 3
  })
}

# ----------------------------------------------------------
# 3. Stage 1: Student Handwriting OCR Queue
# ----------------------------------------------------------
resource "aws_sqs_queue" "paper_ocr_dlq" {
  name                      = "paatam-paper-ocr-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_sqs_queue" "paper_ocr_queue" {
  name                       = "paatam-paper-ocr-queue-${var.environment}"
  visibility_timeout_seconds = 900 # 15 minutes
  message_retention_seconds  = 86400

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.paper_ocr_dlq.arn
    maxReceiveCount     = 3
  })
}

# ----------------------------------------------------------
# 4. Stage 2: Rubric Evaluation & Socratic Hint Queue
# ----------------------------------------------------------
resource "aws_sqs_queue" "paper_evaluation_dlq" {
  name                      = "paatam-paper-evaluation-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_sqs_queue" "paper_evaluation_queue" {
  name                       = "paatam-paper-evaluation-queue-${var.environment}"
  visibility_timeout_seconds = 900 # 15 minutes
  message_retention_seconds  = 86400

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.paper_evaluation_dlq.arn
    maxReceiveCount     = 3
  })
}

# ==========================================================
# 5. ECS Permissions to Dispatch Messages to SQS
# ==========================================================
resource "aws_iam_role_policy" "ecs_sqs_policy" {
  name = "paatam-ecs-sqs-policy-${var.environment}"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueUrl",
          "sqs:GetQueueAttributes"
        ]
        Effect   = "Allow"
        Resource = [
          aws_sqs_queue.assignment_ocr_queue.arn,
          aws_sqs_queue.bulk_split_queue.arn,
          aws_sqs_queue.paper_ocr_queue.arn,
          aws_sqs_queue.paper_evaluation_queue.arn
        ]
      }
    ]
  })
}
