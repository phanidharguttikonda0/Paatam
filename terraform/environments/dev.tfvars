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
