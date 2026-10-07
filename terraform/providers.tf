# Terraform Block: Tells Terraform which providers we need and their versions.
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws" # Downloads the AWS plugin from HashiCorp
      version = "~> 5.0"        # Use version 5.x of the AWS provider
    }
  }
}

# Provider Block: Configures the AWS provider.
provider "aws" {
  region = var.aws_region # We will define this in variables.tf (e.g., "ap-south-1")

  # Default tags apply these tags to EVERY resource Terraform creates.
  # This is amazing for cost tracking and knowing what resource belongs to what environment.
  default_tags {
    tags = {
      Project     = "Paatam"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
