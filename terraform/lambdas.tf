# ==========================================================
# AWS Lambda Workers for AI Processing & Evaluation
# ==========================================================

# 1. Lambda Security Group (Allows outbound to RDS & Internet via NAT Gateway)
resource "aws_security_group" "lambda_sg" {
  name        = "paatam-lambda-sg-${var.environment}"
  description = "Security group for AI worker Lambdas"
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Allow outbound to RDS PostgreSQL"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.isolated_subnets
  }

  egress {
    description = "Allow outbound internet traffic via NAT for Gemini/Sarvam AI APIs"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "paatam-lambda-sg-${var.environment}"
    Environment = var.environment
  }
}


# 2. IAM Role for Lambda Execution
resource "aws_iam_role" "lambda_exec_role" {
  name = "paatam-lambda-ai-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# Attach VPC Execution Role (Enables Lambda inside private subnets)
resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Custom IAM Policy for S3, SQS & CloudWatch
resource "aws_iam_role_policy" "lambda_worker_policy" {
  name = "paatam-lambda-worker-policy-${var.environment}"
  role = aws_iam_role.lambda_exec_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Effect   = "Allow"
        Resource = "${aws_s3_bucket.main.arn}/*"
      },
      {
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:SendMessage"
        ]
        Effect   = "Allow"
        Resource = [
          aws_sqs_queue.assignment_ocr_queue.arn,
          aws_sqs_queue.bulk_split_queue.arn,
          aws_sqs_queue.paper_ocr_queue.arn,
          aws_sqs_queue.paper_evaluation_queue.arn,
          aws_sqs_queue.assignment_ocr_dlq.arn,
          aws_sqs_queue.bulk_split_dlq.arn,
          aws_sqs_queue.paper_ocr_dlq.arn,
          aws_sqs_queue.paper_evaluation_dlq.arn
        ]
      },
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Action   = ["secretsmanager:GetSecretValue"]
        Effect   = "Allow"
        Resource = aws_secretsmanager_secret.db_credentials.arn
      }
    ]
  })
}

# ==========================================================
# 2b. S3 Deployment Bundle for Lambda Workers
# ==========================================================
resource "aws_s3_object" "lambda_bundle" {
  bucket = aws_s3_bucket.main.bucket
  key    = "lambdas/bundle.zip"
  source = fileexists("${path.module}/bundle.zip") ? "${path.module}/bundle.zip" : null
  etag   = fileexists("${path.module}/bundle.zip") ? filemd5("${path.module}/bundle.zip") : null
}

# ==========================================================
# 3. Lambda Functions (HLD Async Pipeline)
# ==========================================================

# Lambda 1: Assignment Ingestion & Difficulty Extraction
resource "aws_lambda_function" "assignment_ocr" {
  function_name = "paatam-assignment-ocr-${var.environment}"
  role          = aws_iam_role.lambda_exec_role.arn
  handler       = "dist/lambdas/assignmentOcr.lambda.handler"
  runtime       = "nodejs20.x"
  timeout       = 900 # 15 minutes
  memory_size   = 1024
  s3_bucket     = aws_s3_bucket.main.bucket
  s3_key        = aws_s3_object.lambda_bundle.key

  depends_on = [
    aws_s3_object.lambda_bundle,
    aws_iam_role_policy_attachment.lambda_vpc_access,
    aws_iam_role_policy.lambda_worker_policy
  ]

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      NODE_ENV           = var.environment
      DATABASE_URL       = "postgresql://postgres:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/paatam?sslmode=require"
      AWS_S3_BUCKET_NAME = aws_s3_bucket.main.bucket
      AWS_REGION_NAME    = var.aws_region
    }
  }

  tags = {
    Name        = "paatam-assignment-ocr-${var.environment}"
    Environment = var.environment
  }
}

# Lambda 2: Bulk Stack Splitter
resource "aws_lambda_function" "bulk_split" {
  function_name = "paatam-bulk-split-${var.environment}"
  role          = aws_iam_role.lambda_exec_role.arn
  handler       = "dist/lambdas/bulkSplit.lambda.handler"
  runtime       = "nodejs20.x"
  timeout       = 900
  memory_size   = 2048 # Slicing master PDFs benefits from higher RAM
  s3_bucket     = aws_s3_bucket.main.bucket
  s3_key        = aws_s3_object.lambda_bundle.key

  depends_on = [
    aws_s3_object.lambda_bundle,
    aws_iam_role_policy_attachment.lambda_vpc_access,
    aws_iam_role_policy.lambda_worker_policy
  ]

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      NODE_ENV           = var.environment
      DATABASE_URL       = "postgresql://postgres:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/paatam?sslmode=require"
      AWS_S3_BUCKET_NAME = aws_s3_bucket.main.bucket
      AWS_REGION_NAME    = var.aws_region
    }
  }

  tags = {
    Name        = "paatam-bulk-split-${var.environment}"
    Environment = var.environment
  }
}

# Lambda 3: Stage 1 Handwritten OCR Worker
resource "aws_lambda_function" "paper_ocr" {
  function_name = "paatam-paper-ocr-${var.environment}"
  role          = aws_iam_role.lambda_exec_role.arn
  handler       = "dist/lambdas/paperOcr.lambda.handler"
  runtime       = "nodejs20.x"
  timeout       = 900
  memory_size   = 1024
  s3_bucket     = aws_s3_bucket.main.bucket
  s3_key        = aws_s3_object.lambda_bundle.key

  depends_on = [
    aws_s3_object.lambda_bundle,
    aws_iam_role_policy_attachment.lambda_vpc_access,
    aws_iam_role_policy.lambda_worker_policy
  ]

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      NODE_ENV           = var.environment
      DATABASE_URL       = "postgresql://postgres:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/paatam?sslmode=require"
      AWS_S3_BUCKET_NAME = aws_s3_bucket.main.bucket
      AWS_REGION_NAME    = var.aws_region
    }
  }

  tags = {
    Name        = "paatam-paper-ocr-${var.environment}"
    Environment = var.environment
  }
}

# Lambda 4: Stage 2 Rubric Evaluation & Reasoning Worker
resource "aws_lambda_function" "paper_evaluation" {
  function_name = "paatam-paper-evaluation-${var.environment}"
  role          = aws_iam_role.lambda_exec_role.arn
  handler       = "dist/lambdas/paperEvaluation.lambda.handler"
  runtime       = "nodejs20.x"
  timeout       = 900
  memory_size   = 1024
  s3_bucket     = aws_s3_bucket.main.bucket
  s3_key        = aws_s3_object.lambda_bundle.key

  depends_on = [
    aws_s3_object.lambda_bundle,
    aws_iam_role_policy_attachment.lambda_vpc_access,
    aws_iam_role_policy.lambda_worker_policy
  ]

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      NODE_ENV           = var.environment
      DATABASE_URL       = "postgresql://postgres:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/paatam?sslmode=require"
      AWS_S3_BUCKET_NAME = aws_s3_bucket.main.bucket
      AWS_REGION_NAME    = var.aws_region
    }
  }

  tags = {
    Name        = "paatam-paper-evaluation-${var.environment}"
    Environment = var.environment
  }
}

# Lambda 5: Sweeper Lambda (Rescues stuck/orphaned jobs)
resource "aws_lambda_function" "sweeper" {
  function_name = "paatam-sweeper-${var.environment}"
  role          = aws_iam_role.lambda_exec_role.arn
  handler       = "dist/lambdas/sweeper.lambda.handler"
  runtime       = "nodejs20.x"
  timeout       = 300 # 5 minutes
  memory_size   = 512
  s3_bucket     = aws_s3_bucket.main.bucket
  s3_key        = aws_s3_object.lambda_bundle.key

  depends_on = [
    aws_s3_object.lambda_bundle,
    aws_iam_role_policy_attachment.lambda_vpc_access,
    aws_iam_role_policy.lambda_worker_policy
  ]

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      NODE_ENV           = var.environment
      DATABASE_URL       = "postgresql://postgres:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/paatam?sslmode=require"
      AWS_S3_BUCKET_NAME = aws_s3_bucket.main.bucket
      AWS_REGION_NAME    = var.aws_region
    }
  }

  tags = {
    Name        = "paatam-sweeper-${var.environment}"
    Environment = var.environment
  }
}

# ==========================================================
# 4. SQS Event Source Mappings (Triggers Lambdas on Messages)
# ==========================================================

resource "aws_lambda_event_source_mapping" "assignment_ocr_trigger" {
  event_source_arn = aws_sqs_queue.assignment_ocr_queue.arn
  function_name    = aws_lambda_function.assignment_ocr.arn
  batch_size       = 1
  enabled          = true
}

resource "aws_lambda_event_source_mapping" "bulk_split_trigger" {
  event_source_arn = aws_sqs_queue.bulk_split_queue.arn
  function_name    = aws_lambda_function.bulk_split.arn
  batch_size       = 1
  enabled          = true
}

resource "aws_lambda_event_source_mapping" "paper_ocr_trigger" {
  event_source_arn = aws_sqs_queue.paper_ocr_queue.arn
  function_name    = aws_lambda_function.paper_ocr.arn
  batch_size       = 1
  enabled          = true
}

resource "aws_lambda_event_source_mapping" "paper_evaluation_trigger" {
  event_source_arn = aws_sqs_queue.paper_evaluation_queue.arn
  function_name    = aws_lambda_function.paper_evaluation.arn
  batch_size       = 1
  enabled          = true
}
