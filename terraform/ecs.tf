# ==========================================
# 1. ECS Security Group
# ==========================================
# This firewall allows the ALB to hit the ECS containers on port 4545.
resource "aws_security_group" "ecs" {
  name        = "paatam-ecs-sg-${var.environment}"
  description = "Security group for ECS Fargate containers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow traffic from ALB"
    from_port       = 4545
    to_port         = 4545
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id] # Only the ALB can hit ECS!
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"] # This uses the NAT Gateway to reach the internet
  }
}

# ==========================================
# 2. CloudWatch Log Group
# ==========================================
# Captures all your Pino console.logs
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/paatam-backend-${var.environment}"
  retention_in_days = 30
}

# ==========================================
# 3. ECS IAM Roles (Execution Role)
# ==========================================
# Allows ECS to pull images from ECR and write logs to CloudWatch
resource "aws_iam_role" "ecs_execution_role" {
  name = "paatam-ecs-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ==========================================
# 4. ECS Cluster
# ==========================================
resource "aws_ecs_cluster" "main" {
  name = "paatam-cluster-${var.environment}"
}

# ==========================================
# 5. ECS Task Definition
# ==========================================
# This defines the "mold" for your container (CPU, RAM, Image, Env Vars)
resource "aws_ecs_task_definition" "main" {
  family                   = "paatam-backend-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn

  # The container definition (JSON)
  container_definitions = jsonencode([{
    name      = "paatam-backend"
    image     = "${aws_ecr_repository.main.repository_url}:latest" # Pointing to the ECR repo!
    essential = true
    portMappings = [{
      containerPort = 4545
      hostPort      = 4545
      protocol      = "tcp"
    }]
    
    # We pass the RDS Proxy URL as an environment variable to the Node.js app!
    environment = [
      { name = "DATABASE_HOST", value = aws_db_proxy.main.endpoint },
      { name = "NODE_ENV", value = var.environment }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

# ==========================================
# 6. ECS Service
# ==========================================
# The Service keeps the desired number of containers running and attaches them to the ALB.
resource "aws_ecs_service" "main" {
  name            = "paatam-service-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = var.ecs_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups = [aws_security_group.ecs.id]
    subnets         = aws_subnet.private[*].id # Placed in Private subnets!
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.main.arn
    container_name   = "paatam-backend"
    container_port   = 4545
  }

  depends_on = [aws_lb_listener.http]
}
