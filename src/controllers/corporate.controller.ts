import { Request, Response, NextFunction } from 'express';
import { CorporateService } from '../services/corporate.service';
import { UserRole } from '../enums/role.enum';
import { AppError } from '../exceptions/AppError';
import { OtpService } from '../services/otp.service';
import { prisma } from '../config/prisma';
import { parseCursorLimit, formatPaginatedResponse } from '../utils/pagination';
import { parseBigInt } from '../utils/bigint';

export class CorporateController {
  public static async lookupByRegistrationNo(req: Request, res: Response, next: NextFunction) {
    try {
      const { registrationNo } = req.params;

      const corporate = await prisma.corporate.findUnique({
        where: { registration_no: registrationNo as string },
        select: { id: true, name: true, registration_no: true } // Only return safe fields
      });

      if (!corporate) {
        throw new AppError('Corporate entity not found', 404);
      }

      res.status(200).json({
        status: 'success',
        data: {
          corporateId: corporate.id.toString(),
          name: corporate.name,
          registration_no: corporate.registration_no
        },
      });
    } catch (error) {
      next(error);
    }
  }
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

      const parsedCorporateId = parseBigInt(corporateId, 'corporateId');
      const newAdmin = await CorporateService.addAdmin(parsedCorporateId, {
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

  public static async getCorporateAdmins(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      
      if (!user || !user.corporateId) {
        throw new AppError('Unauthorized: Missing corporate identity', 401);
      }

      const corporateId = parseBigInt(user.corporateId, 'corporateId');
      const { cursor, limit } = parseCursorLimit(req.query.cursor, req.query.limit);
      const admins = await CorporateService.getCorporateAdmins(corporateId, cursor, limit);
      
      const safeAdmins = admins.map((a: any) => ({
        ...a,
        id: a.id.toString(),
      }));

      const paginated = formatPaginatedResponse(safeAdmins, limit);

      res.status(200).json({
        status: 'success',
        ...paginated
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getCorporateAdminProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { adminId } = req.params;
      const user = (req as any).user;
      if (!user || !user.corporateId) throw new AppError('Unauthorized', 401);

      const parsedAdminId = parseBigInt(adminId, 'adminId');
      const corporateId = parseBigInt(user.corporateId, 'corporateId');
      const admin = await CorporateService.getCorporateAdminProfile(parsedAdminId, corporateId);
      
      res.status(200).json({
        status: 'success',
        data: {
          ...admin,
          id: admin.id.toString(),
          corporate_id: admin.corporate_id.toString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
