import { Request, Response, NextFunction } from 'express';
import { OtpService } from '../services/otp.service';
import { AuthService } from '../services/auth.service';
import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';
import { UserRole } from '../enums/role.enum';

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

  // --- Corporate Admin Login Flow ---

  public static async corporateLoginRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, mobile, corporateId } = req.body;
      
      if (!corporateId) {
        throw new AppError('corporateId is required for login', 400);
      }

      // 1. Check if Corporate Admin exists in THIS corporate entity
      const admin = await prisma.corporateAdmin.findFirst({
        where: {
          corporate_id: BigInt(corporateId),
          OR: [
            { email: email || undefined },
            { mobile: mobile || undefined }
          ]
        }
      });

      if (!admin) {
        throw new AppError('Corporate Admin not found in this corporate entity', 404);
      }

      // 2. Generate and store OTP
      const otp = await OtpService.generateAndStoreOtp(email, mobile);

      res.status(200).json({
        status: 'success',
        message: 'Login OTP sent successfully',
        data: process.env.NODE_ENV === 'production' ? null : { otp } 
      });
    } catch (error) {
      next(error);
    }
  }

  public static async corporateLoginVerify(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, mobile, otp, corporateId } = req.body;

      if (!corporateId) {
        throw new AppError('corporateId is required for verification', 400);
      }

      // 1. Validate and consume OTP (will throw AppError if invalid)
      await OtpService.validateAndConsumeOtp(otp, email, mobile);

      // 2. Fetch the Corporate Admin
      const admin = await prisma.corporateAdmin.findFirst({
        where: {
          corporate_id: BigInt(corporateId),
          OR: [
            { email: email || undefined },
            { mobile: mobile || undefined }
          ]
        }
      });

      if (!admin) {
        throw new AppError('Corporate Admin not found in this corporate entity', 404);
      }

      // 3. Generate Tokens
      const userRole = UserRole.CORPORATE_ADMIN;
      const accessToken = AuthService.generateAccessToken(admin.id, userRole, admin.corporate_id);
      const refreshToken = await AuthService.generateAndStoreRefreshToken(admin.id, userRole);

      // 4. Set Refresh Token as HttpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      // 5. Respond with Access Token
      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          accessToken,
          user: {
            id: admin.id.toString(),
            name: admin.name,
            email: admin.email,
            role: userRole,
            corporateId: admin.corporate_id.toString()
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
