import { Request, Response, NextFunction } from 'express';
import { BranchService } from '../services/branch.service';
import { AppError } from '../exceptions/AppError';

export class BranchController {
  public static async createBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      
      if (!user || !user.corporateId) {
        throw new AppError('Unauthorized: Missing corporate identity', 401);
      }

      const branch = await BranchService.createBranch(BigInt(user.corporateId), req.body);
      
      res.status(201).json({
        status: 'success',
        data: branch
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAdminsForBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId } = req.params;
      const user = (req as any).user;
      
      if (!user || !user.corporateId) {
        throw new AppError('Unauthorized: Missing corporate identity', 401);
      }

      const admins = await BranchService.getAdminsForBranch(BigInt(branchId), BigInt(user.corporateId));
      
      // Need to stringify bigints before returning
      const serializedAdmins = admins.map(admin => ({
        ...admin,
        id: admin.id.toString()
      }));

      res.status(200).json({
        status: 'success',
        data: serializedAdmins
      });
    } catch (error) {
      next(error);
    }
  }
}
