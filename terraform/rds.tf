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
# 2. Database Security Group (Direct Connection)
# ==========================================
# Allows inbound PostgreSQL traffic directly from ECS containers and Lambda workers.
resource "aws_security_group" "rds_db" {
  name        = "paatam-rds-db-sg-${var.environment}"
  description = "Allow inbound PostgreSQL traffic from RDS Proxy ONLY"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow PostgreSQL traffic from ECS Fargate"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  ingress {
    description     = "Allow PostgreSQL traffic from Lambda AI workers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda_sg.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "paatam-rds-db-sg-${var.environment}"
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
  engine_version       = "16"
  
  # These are dynamically pulled from tfvars (e.g., db.t4g.micro for dev)
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  multi_az             = var.db_multi_az
  
  db_name              = "paatam"
  username             = "postgres"
  password             = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds_db.id]
  
  # Because it is in the isolated subnet, publicly_accessible MUST be false.
  publicly_accessible    = false

  # Export database engine logs (error logs, slow query logs, and upgrade logs) to CloudWatch
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  parameter_group_name   = aws_db_parameter_group.main.name

  skip_final_snapshot       = var.environment == "prod" ? false : true # Saves final backup snapshot in prod
  final_snapshot_identifier = var.environment == "prod" ? "paatam-db-prod-final-snapshot" : null
}

# ==========================================
# 4b. RDS PostgreSQL Parameter Group (pgvector support)
# ==========================================
resource "aws_db_parameter_group" "main" {
  name        = "paatam-pg16-params-${var.environment}"
  family      = "postgres16"
  description = "Parameter group for PostgreSQL 16 enabling native pgvector extension and optimizations"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = {
    Name        = "paatam-pg16-params-${var.environment}"
    Description = "PostgreSQL 16 with pgvector support"
  }
}
