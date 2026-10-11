import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from '../config/logger';
import { AppError } from '../exceptions/AppError';

export type OtpEmailPurpose = 'verification' | 'login' | 'reset-password';

const DEFAULT_AWS_REGION = 'ap-south-2';
const DEFAULT_FROM_EMAIL = 'Paatam <noreply@paatam.in>';

// Initialize SES Client
const region = process.env.AWS_REGION || DEFAULT_AWS_REGION;
const credentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
      }
    : undefined;

export const sesClient = new SESClient({
  region,
  ...(credentials ? { credentials } : {}),
});

export class EmailService {
  /**
   * Resolves the configured sender email address
   */
  public static getFromEmail(): string {
    return process.env.AWS_SES_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  }

  /**
   * Generates email subject and copy based on OTP purpose
   */
  private static getEmailCopy(purpose: OtpEmailPurpose = 'verification', otp: string) {
    switch (purpose) {
      case 'login':
        return {
          subject: `Your Paatam Login Code: ${otp}`,
          heading: 'Corporate Portal Login',
          subheading: 'A sign-in request was received for your Paatam account.',
          actionText: 'Use the verification code below to log in to your account. This code is valid for 5 minutes.',
        };
      case 'reset-password':
        return {
          subject: `Your Paatam Password Reset Code: ${otp}`,
          heading: 'Password Reset Request',
          subheading: 'A request was made to reset the password for your Paatam account.',
          actionText: 'Enter the verification code below to verify your identity and set a new password. This code will expire in 5 minutes.',
        };
      case 'verification':
      default:
        return {
          subject: `Your Paatam Verification Code: ${otp}`,
          heading: 'Verify Your Email Address',
          subheading: 'Thank you for registering with Paatam.',
          actionText: 'Please use the 6-digit verification code below to verify your email address. This code will expire in 5 minutes.',
        };
    }
  }

  /**
   * Generates a modern, responsive HTML email template
   */
  private static generateHtmlTemplate(otp: string, purpose: OtpEmailPurpose = 'verification'): string {
    const copy = this.getEmailCopy(purpose, otp);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${copy.subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f6f8;
      padding: 40px 16px;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
      border: 1px solid #e5e7eb;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
      padding: 28px 32px;
      text-align: center;
    }
    .logo-text {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 2px;
      margin: 0;
    }
    .content {
      padding: 36px 32px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 8px 0;
    }
    .subtitle {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }
    .action-text {
      font-size: 15px;
      color: #374151;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }
    .otp-card {
      background-color: #f9fafb;
      border: 2px dashed #cbd5e1;
      border-radius: 10px;
      padding: 20px 16px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #64748b;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .otp-code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #4f46e5;
      margin: 0;
    }
    .expiry-note {
      font-size: 13px;
      color: #dc2626;
      margin-top: 10px;
      font-weight: 500;
    }
    .security-notice {
      background-color: #f8fafc;
      border-left: 4px solid #64748b;
      padding: 12px 16px;
      border-radius: 4px;
      margin-top: 24px;
      font-size: 13px;
      color: #475569;
      line-height: 1.5;
    }
    .footer {
      background-color: #f9fafb;
      border-top: 1px solid #f3f4f6;
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="logo-text">PAATAM</h1>
      </div>
      <div class="content">
        <h2 class="title">${copy.heading}</h2>
        <p class="subtitle">${copy.subheading}</p>
        <p class="action-text">${copy.actionText}</p>
        
        <div class="otp-card">
          <div class="otp-label">Verification Code</div>
          <div class="otp-code">${otp}</div>
          <div class="expiry-note">Expires in 5 minutes</div>
        </div>

        <div class="security-notice">
          <strong>Security Tip:</strong> Never share this code with anyone. Paatam team members will never ask for your verification code. If you did not initiate this request, please safely ignore this email.
        </div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Paatam. All rights reserved.<br>
        This is an automated system email. Please do not reply directly to this message.
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generates a plain-text fallback for email clients that do not support HTML
   */
  private static generatePlainText(otp: string, purpose: OtpEmailPurpose = 'verification'): string {
    const copy = this.getEmailCopy(purpose, otp);

    return `PAATAM - ${copy.heading}

${copy.subheading}

${copy.actionText}

Verification Code: ${otp}
(Expires in 5 minutes)

Security Notice: Never share this code with anyone. If you did not request this verification code, please ignore this email.

--
© ${new Date().getFullYear()} Paatam. All rights reserved.
`;
  }

  /**
   * Dispatches an OTP verification email using AWS SES
   */
  public static async sendOtpEmail(
    toEmail: string,
    otp: string,
    purpose: OtpEmailPurpose = 'verification'
  ): Promise<void> {
    const copy = this.getEmailCopy(purpose, otp);
    const htmlBody = this.generateHtmlTemplate(otp, purpose);
    const textBody = this.generatePlainText(otp, purpose);
    const fromAddress = this.getFromEmail();

    const command = new SendEmailCommand({
      Source: fromAddress,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Charset: 'UTF-8',
          Data: copy.subject,
        },
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: htmlBody,
          },
          Text: {
            Charset: 'UTF-8',
            Data: textBody,
          },
        },
      },
    });

    try {
      await sesClient.send(command);
      logger.info({ to: toEmail, purpose }, 'OTP email successfully sent via AWS SES');
    } catch (error: any) {
      logger.error(
        {
          err: error?.message || error,
          code: error?.name,
          to: toEmail,
        },
        'Failed to dispatch OTP email via AWS SES'
      );

      const errorMessage =
        ['production', 'prod'].includes(process.env.NODE_ENV || '')
          ? 'Failed to send verification email. Please try again later.'
          : `Failed to send verification email: ${error?.message || 'AWS SES error'}`;

      throw new AppError(errorMessage, 500);
    }
  }
}
