import { Request, Response, NextFunction } from 'express';
import { ClassService } from '../services/class.service';
import { parseBigInt } from '../utils/bigint';

export class ClassController {
  public static async getClassesForAcademicYear(req: Request, res: Response, next: NextFunction) {
    try {
      const { academicYearId } = req.params;
      const parsedAcademicYearId = parseBigInt(academicYearId, 'academicYearId');

      const classes = await ClassService.getClassesForAcademicYear(
        parsedAcademicYearId,
        (req as any).user
      );

      res.status(200).json({
        status: 'success',
        data: classes,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createClass(req: Request, res: Response, next: NextFunction) {
    try {
      const { academicYearId } = req.params;
      const parsedAcademicYearId = parseBigInt(academicYearId, 'academicYearId');

      const createdClass = await ClassService.createClass(
        parsedAcademicYearId,
        (req as any).user,
        req.body
      );

      res.status(201).json({
        status: 'success',
        data: createdClass,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getClassDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { classId } = req.params;
      const parsedClassId = parseBigInt(classId, 'classId');

      const classData = await ClassService.getClassDetails(
        parsedClassId,
        (req as any).user
      );

      res.status(200).json({
        status: 'success',
        data: classData,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateClass(req: Request, res: Response, next: NextFunction) {
    try {
      const { classId } = req.params;
      const parsedClassId = parseBigInt(classId, 'classId');

      const updatedClass = await ClassService.updateClass(
        parsedClassId,
        (req as any).user,
        req.body
      );

      res.status(200).json({
        status: 'success',
        data: updatedClass,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteClass(req: Request, res: Response, next: NextFunction) {
    try {
      const { classId } = req.params;
      const parsedClassId = parseBigInt(classId, 'classId');

      const result = await ClassService.deleteClass(
        parsedClassId,
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
