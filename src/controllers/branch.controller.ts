import { Request, Response, NextFunction } from 'express';
import { BranchService } from '../services/branch.service';
import { AppError } from '../exceptions/AppError';
import { parseCursorLimit, formatPaginatedResponse } from '../utils/pagination';
import { parseBigInt } from '../utils/bigint';

export class BranchController {
  public static async createBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      
      if (!user || !user.corporateId) {
        throw new AppError('Unauthorized: Missing corporate identity', 401);
      }

      const corporateId = parseBigInt(user.corporateId, 'corporateId');
      const branch = await BranchService.createBranch(corporateId, req.body);
      
      res.status(201).json({
        status: 'success',
        data: {
          ...branch,
          id: branch.id.toString(),
          corporate_id: branch.corporate_id.toString()
        }
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

      const parsedBranchId = parseBigInt(branchId, 'branchId');
      const corporateId = parseBigInt(user.corporateId, 'corporateId');

      const { cursor, limit } = parseCursorLimit(req.query.cursor, req.query.limit);
      const admins = await BranchService.getAdminsForBranch(parsedBranchId, corporateId, cursor, limit);
      
      const serializedAdmins = admins.map(admin => ({
        ...admin,
        id: admin.id.toString(),
        corporate_id: admin.corporate_id.toString(),
        _accessId: undefined
      }));

      const paginated = formatPaginatedResponse(serializedAdmins, limit);

      res.status(200).json({
        status: 'success',
        ...paginated
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAllBranches(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      
      if (!user || !user.corporateId) {
        throw new AppError('Unauthorized: Missing corporate identity', 401);
      }

      const corporateId = parseBigInt(user.corporateId, 'corporateId');
      const { cursor, limit } = parseCursorLimit(req.query.cursor, req.query.limit);
      const branches = await BranchService.getAllBranches(corporateId, cursor, limit);
      
      const serializedBranches = branches.map(branch => ({
        ...branch,
        id: branch.id.toString(),
        corporate_id: branch.corporate_id.toString()
      }));

      const paginated = formatPaginatedResponse(serializedBranches, limit);

      res.status(200).json({
        status: 'success',
        ...paginated
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getTeachersForBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId } = req.params;
      const user = (req as any).user;
      
      if (!user || !user.corporateId) {
        throw new AppError('Unauthorized: Missing corporate identity', 401);
      }

      const parsedBranchId = parseBigInt(branchId, 'branchId');
      const corporateId = parseBigInt(user.corporateId, 'corporateId');

      const { cursor, limit } = parseCursorLimit(req.query.cursor, req.query.limit);
      const teachers = await BranchService.getTeachersForBranch(parsedBranchId, corporateId, cursor, limit);
      
      const serializedTeachers = teachers.map(t => ({
        ...t,
        id: t.id.toString(),
        branch_id: t.branch_id.toString()
      }));

      const paginated = formatPaginatedResponse(serializedTeachers, limit);

      res.status(200).json({
        status: 'success',
        ...paginated
      });
    } catch (error) {
      next(error);
    }
  }

  public static async searchBranches(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user || !user.corporateId) {
        throw new AppError('Unauthorized: Missing corporate identity', 401);
      }

      const corporateId = parseBigInt(user.corporateId, 'corporateId');
      const query = (req.query.q as string) || '';
      const branches = await BranchService.searchBranches(corporateId, query);

      const serializedBranches = branches.map(b => ({
        ...b,
        id: b.id.toString(),
        corporate_id: b.corporate_id.toString()
      }));

      res.status(200).json({
        status: 'success',
        data: serializedBranches
      });
    } catch (error) {
      next(error);
    }
  }

  public static async removeAdminFromBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId, adminId } = req.params;
      const user = (req as any).user;

      if (!user || !user.corporateId) {
        throw new AppError('Unauthorized: Missing corporate identity', 401);
      }

      const corporateId = parseBigInt(user.corporateId, 'corporateId');
      const parsedBranchId = parseBigInt(branchId, 'branchId');
      const parsedAdminId = parseBigInt(adminId, 'adminId');

      const result = await BranchService.removeAdminFromBranch(corporateId, parsedBranchId, parsedAdminId);

      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

