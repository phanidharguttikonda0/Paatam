# ==========================================
# 1. Web Application Firewall (WAF)
# ==========================================
# WAF protects your ALB from common internet attacks (like SQL injection).
resource "aws_wafv2_web_acl" "main" {
  name        = "paatam-waf-${var.environment}"
  description = "Basic WAF rules for Paatam API"
  scope       = "REGIONAL" # Because it is attached to an ALB

  default_action {
    allow {} # By default, allow the request if it doesn't trigger any blocked rules
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "paatam-waf-metric"
    sampled_requests_enabled   = true
  }

  # Rule 1: AWS Managed Common Rule Set (Blocks bad IPs, SQL injection, Cross-Site Scripting)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }
}

# ==========================================
# 2. Attach WAF to ALB
# ==========================================
resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_lb.main.arn # Attach to the Load Balancer
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
