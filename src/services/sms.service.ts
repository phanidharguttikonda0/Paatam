import twilio from 'twilio';
import { logger } from '../config/logger';
import { AppError } from '../exceptions/AppError';

export type OtpSmsPurpose = 'verification' | 'login' | 'reset-password';

export class SmsService {
  private static client: twilio.Twilio | null = null;

  /**
   * Returns an initialized Twilio client, or null if credentials are not configured.
   */
  private static getClient(): twilio.Twilio | null {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return null;
    }

    if (!this.client) {
      this.client = twilio(accountSid, authToken);
    }

    return this.client;
  }

  /**
   * Normalizes phone number to E.164 format.
   * Defaults to +91 (India) if 10-digit number without country code is provided.
   */
  public static normalizePhoneNumber(mobile: string): string {
    const cleaned = mobile.trim().replace(/[\s-]/g, '');
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    if (cleaned.length === 10) {
      const defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || '+91';
      return `${defaultCountryCode}${cleaned}`;
    }
    return `+${cleaned}`;
  }

  /**
   * Generates SMS message text based on purpose
   */
  private static getMessageBody(otp: string, purpose: OtpSmsPurpose): string {
    switch (purpose) {
      case 'login':
        return `Your Paatam login OTP is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
      case 'reset-password':
        return `Your Paatam password reset OTP is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
      case 'verification':
      default:
        return `Your Paatam verification OTP is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    }
  }

  /**
   * Dispatches an OTP SMS via Twilio
   */
  public static async sendOtpSms(
    mobile: string,
    otp: string,
    purpose: OtpSmsPurpose = 'verification'
  ): Promise<void> {
    const isProd = ['production', 'prod'].includes(process.env.NODE_ENV || '');
    const client = this.getClient();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!client || (!fromNumber && !messagingServiceSid)) {
      if (isProd) {
        logger.error('Twilio credentials or sender phone number are not configured in production');
        throw new AppError('SMS service is currently unavailable', 500);
      }
      logger.warn(
        { mobile },
        '[DEV ONLY] Twilio credentials or TWILIO_PHONE_NUMBER not configured. Skipping SMS dispatch.'
      );
      return;
    }

    const formattedTo = this.normalizePhoneNumber(mobile);
    const body = this.getMessageBody(otp, purpose);

    try {
      const message = await client.messages.create({
        body,
        to: formattedTo,
        ...(messagingServiceSid ? { messagingServiceSid } : { from: fromNumber }),
      });

      logger.info(
        { sid: message.sid, to: formattedTo, purpose },
        'OTP SMS dispatched successfully via Twilio'
      );
    } catch (error: any) {
      logger.error(
        {
          err: error?.message || error,
          code: error?.code,
          to: formattedTo,
        },
        'Failed to dispatch OTP SMS via Twilio'
      );

      if (isProd) {
        throw new AppError('Failed to send verification SMS. Please try again later.', 500);
      } else {
        logger.warn(
          { err: error?.message },
          '[DEV ONLY] Twilio API call failed, continuing execution'
        );
      }
    }
  }
}
