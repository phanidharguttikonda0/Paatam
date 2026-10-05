import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { AppError } from '../exceptions/AppError';

export class AdminController {
  public static async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const admin = await AdminService.createAdmin(req.body);
      
      res.status(201).json({
        status: 'success',
        data: {
          ...admin,
          id: admin.id.toString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async assignBranches(req: Request, res: Response, next: NextFunction) {
    try {
      const { adminId } = req.params;
      const { branch_ids } = req.body;
      const user = (req as any).user;

      if (!user || !user.corporateId) {
        throw new AppError('Unauthorized: Missing corporate identity', 401);
      }

      const branchIdsBigInt = branch_ids.map((id: string | number) => BigInt(id));
      
      const result = await AdminService.assignBranches(BigInt(adminId), branchIdsBigInt, BigInt(user.corporateId));
      
      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { adminId } = req.params;
      const admin = await AdminService.updateAdmin(BigInt(adminId), req.body);
      
      res.status(200).json({
        status: 'success',
        data: {
          ...admin,
          id: admin.id.toString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { adminId } = req.params;
      const result = await AdminService.deleteAdmin(BigInt(adminId));
      
      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAdminBranches(req: Request, res: Response, next: NextFunction) {
    try {
      const { adminId } = req.params;
      const branches = await AdminService.getAdminBranches(BigInt(adminId));
      
      res.status(200).json({
        status: 'success',
        data: branches.map(b => ({
          ...b,
          id: b.id.toString(),
          corporate_id: b.corporate_id.toString()
        }))
      });
    } catch (error) {
      next(error);
    }
  }
}
