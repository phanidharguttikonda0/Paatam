import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { AppError } from '../exceptions/AppError';
import { parseCursorLimit, formatPaginatedResponse } from '../utils/pagination';

export class AdminController {
  public static async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user || !user.corporateId) {
        throw new AppError('Unauthorized: Missing corporate identity', 401);
      }

      const admin = await AdminService.createAdmin(BigInt(user.corporateId), req.body);
      
      res.status(201).json({
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
      const user = (req as any).user;
      if (!user || !user.corporateId) throw new AppError('Unauthorized', 401);

      const admin = await AdminService.updateAdmin(BigInt(adminId), BigInt(user.corporateId), req.body);
      
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

  public static async deleteAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { adminId } = req.params;
      const user = (req as any).user;
      if (!user || !user.corporateId) throw new AppError('Unauthorized', 401);

      const result = await AdminService.deleteAdmin(BigInt(adminId), BigInt(user.corporateId));
      
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
      const { cursor, limit } = parseCursorLimit(req.query.cursor, req.query.limit);
      const branches = await AdminService.getAdminBranches(BigInt(adminId), cursor, limit);
      
      const safeBranches = branches.map(b => ({
        ...b,
        id: b.id.toString(),
        corporate_id: b.corporate_id.toString(),
        _accessId: undefined // remove the internal mapping ID
      }));

      const paginated = formatPaginatedResponse(safeBranches, limit);

      res.status(200).json({
        status: 'success',
        ...paginated
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAdminsForCorporate(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      
      if (!user || !user.corporateId) {
        throw new AppError('Unauthorized: Missing corporate identity', 401);
      }

      const { cursor, limit } = parseCursorLimit(req.query.cursor, req.query.limit);
      const admins = await AdminService.getAdminsForCorporate(BigInt(user.corporateId), cursor, limit);
      
      const safeAdmins = admins.map((a: any) => ({
        ...a,
        id: a.id.toString(),
        corporate_id: a.corporate_id.toString(),
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

  public static async getAdminProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { adminId } = req.params;
      const user = (req as any).user;
      if (!user || !user.corporateId) throw new AppError('Unauthorized', 401);

      const admin = await AdminService.getAdminProfile(BigInt(adminId), BigInt(user.corporateId));
      
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

  public static async searchBranchAdmins(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user || !user.corporateId) throw new AppError('Unauthorized', 401);

      const query = (req.query.q as string) || '';
      if (!query.trim()) {
        return res.status(200).json({ status: 'success', data: [] });
      }

      const admins = await AdminService.searchBranchAdmins(BigInt(user.corporateId), query);
      
      res.status(200).json({
        status: 'success',
        data: admins.map((a: any) => ({
          ...a,
          id: a.id.toString(),
        }))
      });
    } catch (error) {
      next(error);
    }
  }
}
