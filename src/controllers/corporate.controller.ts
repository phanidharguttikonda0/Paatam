import { Request, Response, NextFunction } from 'express';
import { CorporateService } from '../services/corporate.service';
import { UserRole } from '../enums/role.enum';
import { AppError } from '../exceptions/AppError';
import { OtpService } from '../services/otp.service';

export class CorporateController {
  public static async createCorporate(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, registration_no, admin, verificationToken } = req.body;

      // 1. Validate the OTP Verification Token
      const isValid = OtpService.validatePreRegistrationToken(verificationToken, admin.email, admin.mobile);
      if (!isValid) {
        throw new AppError('Invalid or expired verification token. Please verify your email/mobile again.', 401);
      }

      const corporate = await CorporateService.createCorporate({
        name,
        registration_no,
        admin,
      });

      res.status(201).json({
        status: 'success',
        data: corporate,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async addAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { corporateId } = req.params;
      const { name, email, mobile, verificationToken } = req.body;
      const user = (req as any).user; // Set by requireAuth middleware

      // RBAC Check & Tenancy Check: Ensure the user is a Corporate Admin for THIS specific corporateId
      if (!user || user.corporateId !== corporateId) {
        throw new AppError('Forbidden: You do not have permission to add admins to this corporate entity.', 403);
      }

      if (!verificationToken) {
        throw new AppError('Verification token is required. Please verify OTP first.', 400);
      }

      // Validate the OTP Verification Token
      const isValid = OtpService.validatePreRegistrationToken(verificationToken, email, mobile);
      if (!isValid) {
        throw new AppError('Invalid or expired verification token. Please verify your email/mobile again.', 401);
      }

      const newAdmin = await CorporateService.addAdmin(BigInt(corporateId), {
        name,
        email,
        mobile,
      });

      res.status(201).json({
        status: 'success',
        message: 'Admin added successfully',
        data: newAdmin,
      });
    } catch (error) {
      next(error);
    }
  }
}
