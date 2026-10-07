# ==========================================
# 1. Simple Storage Service (S3)
# ==========================================
# This bucket will securely hold user uploads (e.g., Profile Pictures, Documents).
resource "aws_s3_bucket" "main" {
  bucket = "paatam-uploads-${var.environment}" # Bucket names must be globally unique across all of AWS!

  # In Dev, if we delete the bucket, we want to forcefully delete all files inside it.
  # In Prod, we would set this to false to prevent accidental data loss.
  force_destroy = var.environment == "dev" ? true : false
}

# ==========================================
# 2. S3 Bucket Security (Block Public Access)
# ==========================================
# By default, S3 blocks public access. We enforce this explicitly.
# Your Node.js backend should generate "Pre-Signed URLs" to let users download files securely.
resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ==========================================
# 3. ECS Permission to Access S3
# ==========================================
# We need to give your Node.js Fargate containers permission to read/write to this bucket.
# First, we create an IAM "Task Role" (Different from the Execution Role!)
resource "aws_iam_role" "ecs_task_role" {
  name = "paatam-ecs-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

# Grant the Task Role permission to S3
resource "aws_iam_role_policy" "ecs_s3_policy" {
  name = "paatam-ecs-s3-policy-${var.environment}"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.main.arn,
          "${aws_s3_bucket.main.arn}/*"
        ]
      }
    ]
  })
}
