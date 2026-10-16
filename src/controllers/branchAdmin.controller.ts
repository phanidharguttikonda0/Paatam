import { Request, Response, NextFunction } from 'express';
import { BranchAdminService } from '../services/branchAdmin.service';
import { AppError } from '../exceptions/AppError';
import { parseBigInt } from '../utils/bigint';

export class BranchAdminController {
  public static async getMyBranches(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user || !user.userId) {
        throw new AppError('Unauthorized: Missing user identity', 401);
      }

      const adminId = parseBigInt(user.userId, 'userId');
      const branches = await BranchAdminService.getMyBranches(adminId);

      res.status(200).json({
        status: 'success',
        data: branches,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user || !user.userId) {
        throw new AppError('Unauthorized: Missing user identity', 401);
      }

      const adminId = parseBigInt(user.userId, 'userId');
      const profile = await BranchAdminService.getProfile(adminId);

      res.status(200).json({
        status: 'success',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
}
