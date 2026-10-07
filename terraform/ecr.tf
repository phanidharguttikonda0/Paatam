# ==========================================
# 1. ECR (Elastic Container Registry)
# ==========================================
# This creates a private Docker repository for your backend images.
resource "aws_ecr_repository" "main" {
  name                 = "paatam-backend-${var.environment}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
