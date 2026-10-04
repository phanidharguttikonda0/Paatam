import { prisma } from '../config/prisma';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AppError } from '../exceptions/AppError';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_here';

export class OtpService {
  /**
   * Generates a 6-digit OTP and stores it in the database
   */
  public static async generateAndStoreOtp(email?: string, mobile?: string): Promise<string> {
    if (!email && !mobile) {
      throw new AppError('Either email or mobile is required to generate OTP', 400);
    }

    // Generate 6 digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otp.create({
      data: {
        email: email || null,
        mobile: mobile || null,
        otp,
        expires_at: expiresAt,
      },
    });

    // In a real application, you would integrate AWS SNS, SendGrid, Twilio etc. here
    console.log(`[DEV ONLY] OTP for ${email || mobile} is ${otp}`);

    return otp;
  }

  /**
   * Validates and consumes the OTP (deletes it from DB). Throws AppError if invalid.
   */
  public static async validateAndConsumeOtp(otp: string, email?: string, mobile?: string): Promise<boolean> {
    const storedOtp = await prisma.otp.findFirst({
      where: {
        otp,
        email: email || null,
        mobile: mobile || null,
        expires_at: { gt: new Date() } // Must not be expired
      },
      orderBy: { created_at: 'desc' }, // Get the latest one
    });

    if (!storedOtp) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    // OTP is valid. Delete it so it can't be reused.
    await prisma.otp.delete({ where: { id: storedOtp.id } });
    
    return true;
  }

  /**
   * Verifies the OTP. If valid, it returns a temporary Verification Token (used for registration)
   */
  public static async verifyOtp(otp: string, email?: string, mobile?: string): Promise<string> {
    await this.validateAndConsumeOtp(otp, email, mobile);

    // Generate a temporary JWT "Verification Token" valid for 15 minutes
    // This token proves cryptographically that the user verified this email/mobile
    const verificationToken = jwt.sign(
      { 
        verifiedEmail: email, 
        verifiedMobile: mobile, 
        purpose: 'registration' 
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    return verificationToken;
  }

  /**
   * Decodes and validates the Verification Token
   */
  public static validatePreRegistrationToken(token: string, targetEmail: string, targetMobile: string): boolean {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Ensure the email and mobile in the token exactly match what they are trying to register
      if (decoded.verifiedEmail !== targetEmail || decoded.verifiedMobile !== targetMobile) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}
