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
  })
}
