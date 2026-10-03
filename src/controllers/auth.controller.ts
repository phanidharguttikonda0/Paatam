import { Request, Response, NextFunction } from 'express';
import { OtpService } from '../services/otp.service';

export class AuthController {
  public static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, mobile } = req.body;
      
      const otp = await OtpService.generateAndStoreOtp(email, mobile);

      res.status(200).json({
        status: 'success',
        message: 'OTP sent successfully',
        // DO NOT SEND OTP IN RESPONSE IN PRODUCTION! This is just for local testing.
        data: process.env.NODE_ENV === 'production' ? null : { otp } 
      });
    } catch (error) {
      next(error);
    }
  }

  public static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, mobile, otp } = req.body;

      const verificationToken = await OtpService.verifyOtp(otp, email, mobile);

      res.status(200).json({
        status: 'success',
        message: 'OTP verified successfully',
        data: {
          verificationToken
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
