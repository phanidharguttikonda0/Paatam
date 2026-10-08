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
