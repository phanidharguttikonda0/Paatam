import { Request, Response, NextFunction } from 'express';
import { AcademicYearService } from '../services/academicYear.service';
import { parseBigInt } from '../utils/bigint';
import { parseCursorLimit, formatPaginatedResponse } from '../utils/pagination';

export class AcademicYearController {
  public static async getAcademicYears(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId } = req.params;
      const parsedBranchId = parseBigInt(branchId, 'branchId');
      const { cursor, limit } = parseCursorLimit(req.query.cursor, req.query.limit);

      const years = await AcademicYearService.getAcademicYears(
        parsedBranchId,
        (req as any).user,
        cursor,
        limit
      );

      const serializedYears = years.map((y) => ({
        id: y.id.toString(),
        branch_id: y.branch_id.toString(),
        start_year: y.start_year,
        end_year: y.end_year,
        is_active: y.is_active,
        created_at: y.created_at,
      }));

      const paginated = formatPaginatedResponse(serializedYears, limit);

      res.status(200).json({
        status: 'success',
        ...paginated,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createAcademicYear(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId } = req.params;
      const parsedBranchId = parseBigInt(branchId, 'branchId');

      const year = await AcademicYearService.createAcademicYear(
        parsedBranchId,
        (req as any).user,
        req.body
      );

      res.status(201).json({
        status: 'success',
        message: 'Academic year created successfully',
        data: {
          id: year.id.toString(),
          branch_id: year.branch_id.toString(),
          start_year: year.start_year,
          end_year: year.end_year,
          is_active: year.is_active,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateAcademicYear(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsedId = parseBigInt(id, 'id');

      const year = await AcademicYearService.updateAcademicYear(
        parsedId,
        (req as any).user,
        req.body
      );

      res.status(200).json({
        status: 'success',
        data: {
          id: year.id.toString(),
          branch_id: year.branch_id.toString(),
          start_year: year.start_year,
          end_year: year.end_year,
          is_active: year.is_active,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteAcademicYear(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsedId = parseBigInt(id, 'id');

      const result = await AcademicYearService.deleteAcademicYear(
        parsedId,
        (req as any).user
      );

      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
