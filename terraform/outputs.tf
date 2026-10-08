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
