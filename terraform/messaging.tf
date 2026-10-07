# ==========================================
# 1. Simple Email Service (SES) - Email Identity
# ==========================================
# To send emails via SES, you MUST verify that you own the email address or domain.
# This creates the configuration telling AWS: "I want to send emails from this address."
# AWS will send a verification email to this address, which you must click to approve!
resource "aws_ses_email_identity" "main" {
  email = var.company_sender_email
}

# ==========================================
# 2. Simple Notification Service (SNS) - SMS configuration
# ==========================================
# Unlike Twilio, AWS SNS does NOT require you to buy or specify a "Sender Mobile Number".
# AWS uses a pool of short-codes (like 555-123) or your company name to send texts.
# All we need to do is configure default SMS settings (e.g., setting it to "Transactional" for OTPs).
resource "aws_sns_sms_preferences" "main" {
  default_sms_type = "Transactional" # Transactional means it bypasses "Do Not Disturb" lists, crucial for OTPs.
  default_sender_id = "PAATAM"       # The name that appears on the user's phone (Max 11 characters, no spaces)
}

# ==========================================
# 3. ECS Permissions to Access SES & SNS
# ==========================================
# We must grant the Node.js application permission to send Emails and SMS messages.
# We attach this policy to the exact same 'ecs_task_role' we created in s3.tf.
resource "aws_iam_role_policy" "ecs_messaging_policy" {
  name = "paatam-ecs-messaging-policy-${var.environment}"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Effect   = "Allow"
        # In a strict production environment, we lock this down to the specific verified email ARN.
        Resource = "*"
      },
      {
        Action = [
          "sns:Publish"
        ]
        Effect   = "Allow"
        # We allow publishing SMS messages directly to phone numbers
        Resource = "*"
      }
    ]
  })
}
