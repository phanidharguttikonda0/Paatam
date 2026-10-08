import { Request, Response, NextFunction } from 'express';
import { BranchService } from '../services/branch.service';
import { AppError } from '../exceptions/AppError';
import { parseCursorLimit, formatPaginatedResponse } from '../utils/pagination';

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

      const { cursor, limit } = parseCursorLimit(req.query.cursor, req.query.limit);
      const admins = await BranchService.getAdminsForBranch(BigInt(branchId as string), BigInt(user.corporateId), cursor, limit);
      
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

      const { cursor, limit } = parseCursorLimit(req.query.cursor, req.query.limit);
      const branches = await BranchService.getAllBranches(BigInt(user.corporateId), cursor, limit);
      
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

      const { cursor, limit } = parseCursorLimit(req.query.cursor, req.query.limit);
      const teachers = await BranchService.getTeachersForBranch(BigInt(branchId as string), BigInt(user.corporateId), cursor, limit);
      
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
}
