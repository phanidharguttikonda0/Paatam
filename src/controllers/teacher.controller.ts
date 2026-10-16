import { Request, Response, NextFunction } from 'express';
import { TeacherService } from '../services/teacher.service';
import { parseBigInt } from '../utils/bigint';

export class TeacherController {
  public static async createTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = parseBigInt(req.params.branchId, 'branchId');
      const teacher = await TeacherService.createTeacher(branchId, (req as any).user, req.body);
      res.status(201).json({
        status: 'success',
        data: teacher,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async searchTeachers(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = parseBigInt(req.params.branchId, 'branchId');
      const query = (req.query.q as string) || '';
      const teachers = await TeacherService.searchTeachers(branchId, (req as any).user, query);
      res.status(200).json({
        status: 'success',
        data: teachers,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getTeacherById(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId = parseBigInt(req.params.teacherId, 'teacherId');
      const teacher = await TeacherService.getTeacherById(teacherId, (req as any).user);
      res.status(200).json({
        status: 'success',
        data: teacher,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId = parseBigInt(req.params.teacherId, 'teacherId');
      const updated = await TeacherService.updateTeacher(teacherId, (req as any).user, req.body);
      res.status(200).json({
        status: 'success',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId = parseBigInt(req.params.teacherId, 'teacherId');
      const result = await TeacherService.deleteTeacher(teacherId, (req as any).user);
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getTeacherSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId = parseBigInt(req.params.teacherId, 'teacherId');
      const subjects = await TeacherService.getTeacherSubjects(teacherId, (req as any).user);
      res.status(200).json({
        status: 'success',
        data: subjects,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async mapSubjectToTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId = parseBigInt(req.params.teacherId, 'teacherId');
      const subjectId = parseBigInt(req.body.subject_id, 'subject_id');
      const result = await TeacherService.mapSubjectToTeacher(teacherId, (req as any).user, subjectId);
      res.status(201).json({
        status: 'success',
        message: 'Subject mapped to teacher successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async unmapSubjectFromTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId = parseBigInt(req.params.teacherId, 'teacherId');
      const subjectId = parseBigInt(req.params.subjectId, 'subjectId');
      const result = await TeacherService.unmapSubjectFromTeacher(teacherId, (req as any).user, subjectId);
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getTeacherSections(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId = parseBigInt(req.params.teacherId, 'teacherId');
      const sections = await TeacherService.getTeacherSections(teacherId, (req as any).user);
      res.status(200).json({
        status: 'success',
        data: sections,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getTeacherProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId = parseBigInt((req as any).user.userId, 'userId');
      const profile = await TeacherService.getTeacherProfile(teacherId);
      res.status(200).json({
        status: 'success',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getTeacherDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const teacherId = parseBigInt((req as any).user.userId, 'userId');
      const dashboard = await TeacherService.getTeacherDashboard(teacherId);
      res.status(200).json({
        status: 'success',
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getTeacherSectionSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const sectionId = parseBigInt(req.params.sectionId, 'sectionId');
      const teacherId = parseBigInt((req as any).user.userId, 'userId');
      const subjects = await TeacherService.getTeacherSectionSubjects(sectionId, teacherId);
      res.status(200).json({
        status: 'success',
        data: subjects,
      });
    } catch (error) {
      next(error);
    }
  }
}
