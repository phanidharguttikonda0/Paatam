# variables.tf defines the inputs we expect when running Terraform.
# This allows us to use the exact same code for both Dev and Prod by just passing different values.

variable "aws_region" {
  description = "The AWS region to deploy to (e.g., ap-south-1)"
  type        = string
  default     = "ap-south-2" # Hyderabad region
}

variable "environment" {
  description = "The environment name (e.g., dev, prod)"
  type        = string
}

variable "vpc_cidr" {
  description = "The IP range for the entire VPC (e.g., 10.0.0.0/16)"
  type        = string
  # A /16 gives us 65,536 IP addresses, which is plenty to divide into subnets.
}

variable "public_subnets" {
  description = "List of CIDR blocks for Public Subnets"
  type        = list(string)
}

variable "private_subnets" {
  description = "List of CIDR blocks for Private Subnets (with NAT access)"
  type        = list(string)
}

variable "isolated_subnets" {
  description = "List of CIDR blocks for Isolated Subnets (no internet access)"
  type        = list(string)
}

# ================================
# Database Variables
# ================================
variable "db_instance_class" {
  description = "The instance type of the RDS database"
  type        = string
}

variable "db_allocated_storage" {
  description = "The allocated storage in gigabytes"
  type        = number
}

variable "db_multi_az" {
  description = "Whether to deploy the DB across multiple Availability Zones"
  type        = bool
}

# ================================
# Compute Variables (ECS)
# ================================
variable "ecs_task_cpu" {
  description = "CPU units for the ECS task (1024 = 1 vCPU)"
  type        = number
}

variable "ecs_task_memory" {
  description = "Memory for the ECS task (in MiB, e.g., 1024 = 1 GB)"
  type        = number
}

variable "ecs_desired_count" {
  description = "Number of Fargate containers to run"
  type        = number
}

# ================================
# Messaging Variables
# ================================
variable "company_sender_email" {
  description = "The official company email used to send OTPs (e.g., noreply@paatam.com)"
  type        = string
}
