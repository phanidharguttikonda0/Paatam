import { Request, Response, NextFunction } from 'express';
import { SubjectService } from '../services/subject.service';
import { parseBigInt } from '../utils/bigint';
import { parseCursorLimit, formatPaginatedResponse } from '../utils/pagination';

export class SubjectController {
  public static async getBranchSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId } = req.params;
      const parsedBranchId = parseBigInt(branchId, 'branchId');
      const { cursor, limit } = parseCursorLimit(req.query.cursor, req.query.limit);

      const subjects = await SubjectService.getBranchSubjects(
        parsedBranchId,
        (req as any).user,
        cursor,
        limit
      );

      const paginated = formatPaginatedResponse(subjects, limit);

      res.status(200).json({
        status: 'success',
        ...paginated,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createBranchSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId } = req.params;
      const parsedBranchId = parseBigInt(branchId, 'branchId');

      const subject = await SubjectService.createBranchSubject(
        parsedBranchId,
        (req as any).user,
        req.body
      );

      res.status(201).json({
        status: 'success',
        data: subject,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const { subjectId } = req.params;
      const parsedSubjectId = parseBigInt(subjectId, 'subjectId');

      const updated = await SubjectService.updateSubject(
        parsedSubjectId,
        (req as any).user,
        req.body
      );

      res.status(200).json({
        status: 'success',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const { subjectId } = req.params;
      const parsedSubjectId = parseBigInt(subjectId, 'subjectId');

      const result = await SubjectService.deleteSubject(
        parsedSubjectId,
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

  public static async getClassSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { classId } = req.params;
      const parsedClassId = parseBigInt(classId, 'classId');

      const subjects = await SubjectService.getClassSubjects(
        parsedClassId,
        (req as any).user
      );

      res.status(200).json({
        status: 'success',
        data: subjects,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async attachSubjectToClass(req: Request, res: Response, next: NextFunction) {
    try {
      const { classId } = req.params;
      const parsedClassId = parseBigInt(classId, 'classId');
      const parsedSubjectId = parseBigInt(req.body.subject_id, 'subject_id');

      const result = await SubjectService.attachSubjectToClass(
        parsedClassId,
        (req as any).user,
        parsedSubjectId
      );

      res.status(201).json({
        status: 'success',
        message: 'Subject attached to class successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async removeClassSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const { classId, classSubjectId } = req.params;
      const parsedClassId = parseBigInt(classId, 'classId');
      const parsedClassSubjectId = parseBigInt(classSubjectId, 'classSubjectId');

      const result = await SubjectService.removeClassSubject(
        parsedClassId,
        parsedClassSubjectId,
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
