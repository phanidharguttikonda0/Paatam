# ==========================================
# 1. AWS Secrets Manager (Database Credentials)
# ==========================================

# This creates the "bucket" or container for the secret in AWS.
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "paatam/db/credentials-${var.environment}"
  description             = "PostgreSQL credentials for Paatam ${var.environment}"
  recovery_window_in_days = 0 # Force deletion immediately when destroying dev env
}

# This places the actual JSON payload into the secret container.
# It uses the random password generated in rds.tf.
resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  
  secret_string = jsonencode({
    username             = aws_db_instance.main.username
    password             = random_password.db_password.result
    engine               = "postgres"
    host                 = aws_db_instance.main.address
    port                 = aws_db_instance.main.port
    dbname               = aws_db_instance.main.db_name
    dbInstanceIdentifier = aws_db_instance.main.id
    # Prisma connection URL using the RDS Proxy endpoint for connection pooling!
    DATABASE_URL         = "postgresql://${aws_db_instance.main.username}:${random_password.db_password.result}@${aws_db_proxy.main.endpoint}:5432/${aws_db_instance.main.db_name}?connection_limit=1"
  })
}

# ==========================================
# 2. ECS Execution Role Permissions
# ==========================================
# Allow ECS to read this specific secret so it can inject DATABASE_URL securely!
resource "aws_iam_role_policy" "ecs_secrets_policy" {
  name = "paatam-ecs-secrets-policy-${var.environment}"
  role = aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["secretsmanager:GetSecretValue"]
        Effect   = "Allow"
        Resource = aws_secretsmanager_secret.db_credentials.arn
      }
    ]
  })
}
