# ==========================================
# 1. DB Subnet Group
# ==========================================
# This tells RDS which subnets it is allowed to live in.
# We exclusively assign it to our Isolated subnets (no internet).
resource "aws_db_subnet_group" "main" {
  name       = "paatam-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.isolated[*].id

  tags = {
    Name = "paatam-db-subnet-group-${var.environment}"
  }
}

# ==========================================
# 2. Security Groups (The Firewalls)
# ==========================================
# (Note: The ECS Security Group is defined in ecs.tf)

# The RDS Proxy Security Group
resource "aws_security_group" "rds_proxy" {
  name        = "paatam-rds-proxy-sg-${var.environment}"
  description = "Allow inbound PostgreSQL traffic from ECS containers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow traffic from ECS Fargate"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id] # Only ECS can hit the proxy
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# The RDS Database Security Group
resource "aws_security_group" "rds_db" {
  name        = "paatam-rds-db-sg-${var.environment}"
  description = "Allow inbound PostgreSQL traffic from RDS Proxy ONLY"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow traffic from RDS Proxy"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds_proxy.id] # Strict lockdown: Only Proxy can hit DB
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ==========================================
# 3. Generating a Secure Password
# ==========================================
resource "random_password" "db_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# ==========================================
# 4. The RDS PostgreSQL Database
# ==========================================
resource "aws_db_instance" "main" {
  identifier = "paatam-db-${var.environment}"
  
  engine               = "postgres"
  engine_version       = "16.3"
  
  # These are dynamically pulled from tfvars (e.g., db.t4g.micro for dev)
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  multi_az             = var.db_multi_az
  
  db_name              = "paatam"
  username             = "postgres"
  password             = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds_db.id]
  
  # Because it is in the isolated subnet, public_ly_accessible MUST be false.
  publicly_accessible    = false

  skip_final_snapshot    = true # Set to false in production to save backups when deleting!
}

# ==========================================
# 5. RDS Proxy IAM Role
# ==========================================
# The Proxy needs permission to read the database password from Secrets Manager.
resource "aws_iam_role" "rds_proxy" {
  name = "paatam-rds-proxy-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "rds_proxy_secrets" {
  name = "paatam-rds-proxy-secrets-policy-${var.environment}"
  role = aws_iam_role.rds_proxy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Effect   = "Allow"
        Resource = [aws_secretsmanager_secret.db_credentials.arn]
      }
    ]
  })
}

# ==========================================
# 6. The RDS Proxy
# ==========================================
resource "aws_db_proxy" "main" {
  name                   = "paatam-rds-proxy-${var.environment}"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800
  require_tls            = true
  role_arn               = aws_iam_role.rds_proxy.arn
  vpc_security_group_ids = [aws_security_group.rds_proxy.id]
  vpc_subnet_ids         = aws_subnet.private[*].id # Proxy lives in Private Subnet to be close to ECS

  auth {
    auth_scheme = "SECRETS"
    description = "Use Secrets Manager to auth to RDS"
    iam_auth    = "DISABLED"
    secret_arn  = aws_secretsmanager_secret.db_credentials.arn
  }

  depends_on = [aws_db_instance.main]
}

# Link the Proxy to our Database
resource "aws_db_proxy_default_target_group" "main" {
  db_proxy_name = aws_db_proxy.main.name

  connection_pool_config {
    connection_borrow_timeout    = 120
    max_connections_percent      = 100
    max_idle_connections_percent = 50
  }
}

resource "aws_db_proxy_target" "main" {
  db_instance_identifier = aws_db_instance.main.id
  db_proxy_name          = aws_db_proxy.main.name
  target_group_name      = aws_db_proxy_default_target_group.main.name
}
