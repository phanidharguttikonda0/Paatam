# ==========================================
# 1. ALB Security Group
# ==========================================
# This firewall allows public internet traffic to hit the Load Balancer
# on standard web ports (HTTP/HTTPS).
resource "aws_security_group" "alb" {
  name        = "paatam-alb-sg-${var.environment}"
  description = "Allow inbound HTTP/HTTPS traffic from the internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Allow HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ==========================================
# 2. Application Load Balancer (ALB)
# ==========================================
# The ALB sits in the Public Subnets and routes traffic.
resource "aws_lb" "main" {
  name               = "paatam-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id # Placed in public subnets!
}

# ==========================================
# 3. ALB Target Group
# ==========================================
# The Target Group keeps track of the dynamically changing IP addresses
# of your ECS Fargate containers.
resource "aws_lb_target_group" "main" {
  name        = "paatam-tg-${var.environment}"
  port        = 4545 # The port your Node.js app runs on
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" # Required for Fargate

  health_check {
    path                = "/api/health" # We need a basic health route in your app
    healthy_threshold   = 2
    unhealthy_threshold = 10
  }
}

# ==========================================
# 4. ALB Listener
# ==========================================
# The Listener sits on the ALB and "listens" for traffic on Port 80.
# When traffic arrives, it forwards it to the Target Group.
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}
