# This file provides the actual values for the DEV environment.
# You will run: terraform plan -var-file="environments/dev.tfvars"

environment = "dev"
aws_region  = "ap-south-2"

# The VPC IP range: 10.0.0.0 to 10.0.255.255
vpc_cidr = "10.0.0.0/16"

# For Dev, we can use 2 Availability Zones (e.g., ap-south-1a, ap-south-1b)
# We carve the VPC into smaller subnets:
public_subnets   = ["10.0.1.0/24", "10.0.2.0/24"] # For ALB and NAT Gateway
private_subnets  = ["10.0.11.0/24", "10.0.12.0/24"] # For ECS Fargate
isolated_subnets = ["10.0.21.0/24", "10.0.22.0/24"] # For RDS Database

# Dev Database Configuration
db_instance_class    = "db.t4g.micro" # Cheapest compute
db_allocated_storage = 20             # 20 GB storage
db_multi_az          = false          # Single instance for Dev (No failover)

# Dev Compute Configuration
ecs_task_cpu      = 1024 # 1 vCPU
ecs_task_memory   = 1024 # 1 GB RAM
ecs_desired_count = 2    # Run 2 containers by default

# Dev Messaging Configuration
company_sender_email = "noreply-dev@paatam.com"
