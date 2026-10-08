# This file provides the actual values for the PROD environment.
# As you requested, we will just create it now, but won't run it until 2-3 weeks later.
# You will run: terraform plan -var-file="environments/prod.tfvars"

environment = "prod"
aws_region  = "ap-south-2"

# We use a completely different IP range to ensure no IP collision with Dev.
# Prod VPC IP range: 10.1.0.0 to 10.1.255.255
vpc_cidr = "10.1.0.0/16"

# For Prod, we span across 3 Availability Zones for maximum reliability.
public_subnets   = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
private_subnets  = ["10.1.11.0/24", "10.1.12.0/24", "10.1.13.0/24"]
isolated_subnets = ["10.1.21.0/24", "10.1.22.0/24", "10.1.23.0/24"]

# Prod Database Configuration
db_instance_class    = "db.t4g.medium" # Better compute
db_allocated_storage = 100             # 100 GB storage
db_multi_az          = true            # Highly available (Standby replica in another AZ)

# Prod Compute Configuration
ecs_task_cpu      = 2048 # 2 vCPU
ecs_task_memory   = 4096 # 4 GB RAM
ecs_desired_count = 3    # Run 3 containers by default

# Prod Messaging Configuration
company_domain = "paatam.in"
