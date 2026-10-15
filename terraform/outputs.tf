# ==========================================
# OUTPUTS
# ==========================================
# These outputs are printed to your terminal after running `terraform apply`.
# They contain important values you need to configure your external services.

output "ses_domain_verification_tokens" {
  description = "The CNAME records you must add to your Domain Registrar (e.g., GoDaddy, Hostinger) to verify your domain for SES."
  value = [
    for token in aws_ses_domain_dkim.main.dkim_tokens : {
      type  = "CNAME"
      name  = "${token}._domainkey.${var.company_domain}"
      value = "${token}.dkim.amazonses.com"
    }
  ]
}

output "ses_domain_verification_txt_record" {
  description = "The TXT record for explicit domain verification (optional if DKIM works, but helps speed it up)"
  value = {
    type  = "TXT"
    name  = "_amazonses.${var.company_domain}"
    value = aws_ses_domain_identity.main.verification_token
  }
}

output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "ecr_repository_url" {
  description = "The URL of the ECR repository"
  value       = aws_ecr_repository.main.repository_url
}

output "rds_endpoint" {
  description = "The address of the RDS database instance"
  value       = aws_db_instance.main.address
}

output "rds_proxy_endpoint" {
  description = "The endpoint of the RDS Proxy"
  value       = aws_db_proxy.main.endpoint
}

output "s3_bucket_name" {
  description = "The S3 bucket for uploads"
  value       = aws_s3_bucket.main.bucket
}

