import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { AppError } from '../exceptions/AppError';
import { parseCursorLimit, formatPaginatedResponse } from '../utils/pagination';
import { parseBigInt } from '../utils/bigint';

export class AdminController {
  public static async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user || !user.corporateId) {
        throw new AppError('Unauthorized: Missing corporate identity', 401);
      }

      const corporateId = parseBigInt(user.corporateId, 'corporateId');
      const admin = await AdminService.createAdmin(corporateId, req.body);
      
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

      const parsedAdminId = parseBigInt(adminId, 'adminId');
      const corporateId = parseBigInt(user.corporateId, 'corporateId');
      const branchIdsBigInt = branch_ids.map((id: string | number) => parseBigInt(id, 'branch_id'));
      
      const result = await AdminService.assignBranches(parsedAdminId, branchIdsBigInt, corporateId);
      
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

      const parsedAdminId = parseBigInt(adminId, 'adminId');
      const corporateId = parseBigInt(user.corporateId, 'corporateId');
      const admin = await AdminService.updateAdmin(parsedAdminId, corporateId, req.body);
      
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

      const parsedAdminId = parseBigInt(adminId, 'adminId');
      const corporateId = parseBigInt(user.corporateId, 'corporateId');
      const result = await AdminService.deleteAdmin(parsedAdminId, corporateId);
      
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
      const parsedAdminId = parseBigInt(adminId, 'adminId');
      const { cursor, limit } = parseCursorLimit(req.query.cursor, req.query.limit);
      const branches = await AdminService.getAdminBranches(parsedAdminId, cursor, limit);
      
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

      const corporateId = parseBigInt(user.corporateId, 'corporateId');
      const { cursor, limit } = parseCursorLimit(req.query.cursor, req.query.limit);
      const admins = await AdminService.getAdminsForCorporate(corporateId, cursor, limit);
      
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

      const parsedAdminId = parseBigInt(adminId, 'adminId');
      const corporateId = parseBigInt(user.corporateId, 'corporateId');
      const admin = await AdminService.getAdminProfile(parsedAdminId, corporateId);
      
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

      const corporateId = parseBigInt(user.corporateId, 'corporateId');
      const query = (req.query.q as string) || '';
      if (!query.trim()) {
        return res.status(200).json({ status: 'success', data: [] });
      }

      const admins = await AdminService.searchBranchAdmins(corporateId, query);
      
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
