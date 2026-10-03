import { Request, Response, NextFunction } from 'express';
import { CorporateService } from '../services/corporate.service';

export class CorporateController {
  public static async createCorporate(req: Request, res: Response, next: NextFunction) {
    try {
      const corporate = await CorporateService.createCorporate(req.body);
      res.status(201).json({
        status: 'success',
        data: corporate,
      });
    } catch (error) {
      next(error); // Pass to global error handler
    }
  }

  public static async addAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { corporateId } = req.params;
      const { name, email, mobile } = req.body;
      const user = (req as any).user; // Set by requireAuth middleware

      // RBAC Check: Ensure the user is a Corporate Admin for THIS specific corporateId
      // Optionally allow SUPER_ADMIN to bypass this if you have such a role later
      if (!user || user.role !== 'CORPORATE_ADMIN' || user.corporateId !== corporateId) {
        throw new AppError('Forbidden: You do not have permission to add admins to this corporate entity.', 403);
      }

      // TODO: Include OTP Verification token check here before adding the admin.
      // e.g., await OtpService.verifyPreRegistrationToken(email, mobile, req.body.verificationToken);

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
