import { Request, Response, NextFunction } from 'express';
import { SectionService } from '../services/section.service';
import { parseBigInt } from '../utils/bigint';

export class SectionController {
  public static async getSectionsForClass(req: Request, res: Response, next: NextFunction) {
    try {
      const { classId } = req.params;
      const parsedClassId = parseBigInt(classId, 'classId');

      const sections = await SectionService.getSectionsForClass(
        parsedClassId,
        (req as any).user
      );

      res.status(200).json({
        status: 'success',
        data: sections,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createSection(req: Request, res: Response, next: NextFunction) {
    try {
      const { classId } = req.params;
      const parsedClassId = parseBigInt(classId, 'classId');
      const { section_name, strength, class_teacher_id } = req.body;

      const parsedTeacherId = class_teacher_id
        ? parseBigInt(class_teacher_id, 'class_teacher_id')
        : undefined;

      const created = await SectionService.createSection(
        parsedClassId,
        (req as any).user,
        {
          section_name,
          strength,
          class_teacher_id: parsedTeacherId,
        }
      );

      res.status(201).json({
        status: 'success',
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getSectionDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { sectionId } = req.params;
      const parsedSectionId = parseBigInt(sectionId, 'sectionId');

      const details = await SectionService.getSectionDetails(
        parsedSectionId,
        (req as any).user
      );

      res.status(200).json({
        status: 'success',
        data: details,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateSection(req: Request, res: Response, next: NextFunction) {
    try {
      const { sectionId } = req.params;
      const parsedSectionId = parseBigInt(sectionId, 'sectionId');

      const updated = await SectionService.updateSection(
        parsedSectionId,
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

  public static async deleteSection(req: Request, res: Response, next: NextFunction) {
    try {
      const { sectionId } = req.params;
      const parsedSectionId = parseBigInt(sectionId, 'sectionId');

      const result = await SectionService.deleteSection(
        parsedSectionId,
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

  public static async assignClassTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const { sectionId } = req.params;
      const parsedSectionId = parseBigInt(sectionId, 'sectionId');
      const parsedTeacherId = parseBigInt(req.body.teacher_id, 'teacher_id');

      const result = await SectionService.assignClassTeacher(
        parsedSectionId,
        (req as any).user,
        parsedTeacherId
      );

      res.status(200).json({
        status: 'success',
        message: 'Class teacher assigned successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async removeClassTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const { sectionId } = req.params;
      const parsedSectionId = parseBigInt(sectionId, 'sectionId');

      const result = await SectionService.removeClassTeacher(
        parsedSectionId,
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

  public static async getSectionSubjectsTeachers(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { sectionId } = req.params;
      const parsedSectionId = parseBigInt(sectionId, 'sectionId');

      const matrix = await SectionService.getSectionSubjectsTeachers(
        parsedSectionId,
        (req as any).user
      );

      res.status(200).json({
        status: 'success',
        data: matrix,
      });
    } catch (error) {
      next(error);
    }
  }
}
