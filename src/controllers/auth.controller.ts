import { Request, Response, NextFunction } from 'express';
import { OtpService } from '../services/otp.service';
import { AuthService } from '../services/auth.service';
import { AdminService } from '../services/admin.service';
import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';
import { UserRole } from '../enums/role.enum';
import { parseBigInt } from '../utils/bigint';

const isProduction = ['production', 'prod'].includes(process.env.NODE_ENV || '');

export class AuthController {
  public static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, mobile } = req.body;
      
      const otp = await OtpService.generateAndStoreOtp(email, mobile, 'verification');

      res.status(200).json({
        status: 'success',
        message: 'OTP sent successfully',
        // DO NOT SEND OTP IN RESPONSE IN PRODUCTION! This is just for local testing.
        data: isProduction ? null : { otp } 
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

      const parsedCorporateId = parseBigInt(corporateId, 'corporateId');

      // 1. Check if Corporate Admin exists in THIS corporate entity
      const admin = await prisma.corporateAdmin.findFirst({
        where: {
          corporate_id: parsedCorporateId,
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
      const otp = await OtpService.generateAndStoreOtp(email, mobile, 'login');

      res.status(200).json({
        status: 'success',
        message: 'Login OTP sent successfully',
        data: isProduction ? null : { otp } 
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

      const parsedCorporateId = parseBigInt(corporateId, 'corporateId');

      // 1. Validate and consume OTP (will throw AppError if invalid)
      await OtpService.validateAndConsumeOtp(otp, email, mobile);

      // 2. Fetch the Corporate Admin
      const admin = await prisma.corporateAdmin.findFirst({
        where: {
          corporate_id: parsedCorporateId,
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
        secure: isProduction,
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

  // --- Token Refresh Flow ---

  public static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!token) {
        throw new AppError('Refresh token required', 401);
      }

      const newAccessToken = await AuthService.refreshAccessToken(token);

      if (!newAccessToken) {
        throw new AppError('Invalid or expired refresh token', 401);
      }

      res.status(200).json({
        status: 'success',
        message: 'Access token refreshed successfully',
        data: {
          accessToken: newAccessToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Branch Admin Login Flow ---

  public static async adminLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, password } = req.body;
      
      const admin = await prisma.admin.findFirst({
        where: {
          OR: [
            { contact_email: identifier },
            { mobile: identifier }
          ]
        }
      });

      if (!admin) {
        throw new AppError('Invalid credentials', 401);
      }

      const isValidPassword = await require('bcrypt').compare(password, admin.password_hash);
      if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401);
      }

      const userRole = admin.role; 
      const accessToken = AuthService.generateAccessToken(admin.id, userRole);
      const refreshToken = await AuthService.generateAndStoreRefreshToken(admin.id, userRole);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          accessToken,
          user: {
            id: admin.id.toString(),
            name: admin.admin_name,
            email: admin.contact_email,
            role: userRole
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async adminForgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, corporateId } = req.body;
      
      if (!corporateId) {
        throw new AppError('corporateId is required', 400);
      }

      const parsedCorporateId = parseBigInt(corporateId, 'corporateId');
      const admin = await AdminService.checkAdminExistsByIdentifier(identifier, parsedCorporateId);
      
      // Figure out if identifier is email or mobile based on what matched
      const isEmail = admin.contact_email === identifier;
      const isMobile = admin.mobile === identifier;

      const otp = await OtpService.generateAndStoreOtp(
        isEmail ? identifier : undefined,
        isMobile ? identifier : undefined,
        'reset-password'
      );

      res.status(200).json({
        status: 'success',
        message: 'Password reset OTP sent successfully',
        data: isProduction ? null : { otp }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async adminResetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, corporateId, otp, new_password } = req.body;

      if (!corporateId) throw new AppError('corporateId is required', 400);

      const parsedCorporateId = parseBigInt(corporateId, 'corporateId');
      const admin = await AdminService.checkAdminExistsByIdentifier(identifier, parsedCorporateId);

      const isEmail = admin.contact_email === identifier;
      const isMobile = admin.mobile === identifier;

      await OtpService.validateAndConsumeOtp(
        otp,
        isEmail ? identifier : undefined,
        isMobile ? identifier : undefined
      );

      await AdminService.updatePassword(admin.id, new_password);

      res.status(200).json({
        status: 'success',
        message: 'Password has been reset successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Teacher Authentication Portal Flow ---

  public static async teacherLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, password } = req.body;

      const teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { contact_email: identifier },
            { teacher_id: identifier },
            { contact_mobile: identifier },
          ],
        },
      });

      if (!teacher) {
        throw new AppError('Invalid credentials', 401);
      }

      const isValidPassword = await require('bcrypt').compare(password, teacher.password_hash);
      if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401);
      }

      const userRole = UserRole.TEACHER;
      const accessToken = AuthService.generateAccessToken(teacher.id, userRole);
      const refreshToken = await AuthService.generateAndStoreRefreshToken(teacher.id, userRole);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          accessToken,
          user: {
            id: teacher.id.toString(),
            name: teacher.name,
            teacher_id: teacher.teacher_id,
            role: userRole,
            branch_id: teacher.branch_id.toString(),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async teacherForgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, branch_id } = req.body;

      const whereClause: any = {
        OR: [
          { contact_email: identifier },
          { teacher_id: identifier },
          { contact_mobile: identifier },
        ],
      };

      if (branch_id) {
        whereClause.branch_id = parseBigInt(branch_id, 'branch_id');
      }

      const teacher = await prisma.teacher.findFirst({
        where: whereClause,
      });

      if (!teacher) {
        throw new AppError('Teacher not found', 404);
      }

      const isEmail = teacher.contact_email === identifier;
      const isMobile = teacher.contact_mobile === identifier;

      const otp = await OtpService.generateAndStoreOtp(
        isEmail ? identifier : teacher.contact_email,
        isMobile ? identifier : (teacher.contact_mobile || undefined),
        'reset-password'
      );

      res.status(200).json({
        status: 'success',
        message: 'Password reset OTP sent successfully',
        data: isProduction ? null : { otp },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async teacherResetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, branch_id, otp, new_password } = req.body;

      const whereClause: any = {
        OR: [
          { contact_email: identifier },
          { teacher_id: identifier },
          { contact_mobile: identifier },
        ],
      };

      if (branch_id) {
        whereClause.branch_id = parseBigInt(branch_id, 'branch_id');
      }

      const teacher = await prisma.teacher.findFirst({
        where: whereClause,
      });

      if (!teacher) {
        throw new AppError('Teacher not found', 404);
      }

      const isEmail = teacher.contact_email === identifier;
      const isMobile = teacher.contact_mobile === identifier;

      await OtpService.validateAndConsumeOtp(
        otp,
        isEmail ? identifier : teacher.contact_email,
        isMobile ? identifier : (teacher.contact_mobile || undefined)
      );

      const hashedPassword = await require('bcrypt').hash(new_password, 10);
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { password_hash: hashedPassword },
      });

      res.status(200).json({
        status: 'success',
        message: 'Password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
