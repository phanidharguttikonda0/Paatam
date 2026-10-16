import { Request, Response, NextFunction } from 'express';
import { StudentService } from '../services/student.service';
import { parseBigInt } from '../utils/bigint';
import { parseCursorLimit } from '../utils/pagination';

export class StudentController {
  public static async getStudentsForSection(req: Request, res: Response, next: NextFunction) {
    try {
      const sectionId = parseBigInt(req.params.sectionId, 'sectionId');
      const { cursor, limit } = parseCursorLimit(req.query.cursor, req.query.limit);
      const search = req.query.search as string | undefined;

      const result = await StudentService.getStudentsForSection(
        sectionId,
        (req as any).user,
        cursor,
        limit,
        search
      );

      res.status(200).json({
        status: 'success',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async searchStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = parseBigInt(req.params.branchId, 'branchId');
      const query = (req.query.q as string) || '';
      const sectionId = req.query.section_id
        ? parseBigInt(req.query.section_id as string, 'section_id')
        : undefined;

      const students = await StudentService.searchStudents(
        branchId,
        (req as any).user,
        query,
        sectionId
      );

      res.status(200).json({
        status: 'success',
        data: students,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const sectionId = parseBigInt(req.params.sectionId, 'sectionId');
      const student = await StudentService.createStudent(
        sectionId,
        (req as any).user,
        req.body
      );

      res.status(201).json({
        status: 'success',
        data: student,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async bulkCreateStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const sectionId = parseBigInt(req.params.sectionId, 'sectionId');
      const result = await StudentService.bulkCreateStudents(
        sectionId,
        (req as any).user,
        req.body.students
      );

      res.status(200).json({
        status: 'success',
        message: `Enrolled ${result.successful_count} students successfully (${result.failed_count} failed)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getStudentById(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = parseBigInt(req.params.studentId, 'studentId');
      const student = await StudentService.getStudentById(studentId, (req as any).user);

      res.status(200).json({
        status: 'success',
        data: student,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = parseBigInt(req.params.studentId, 'studentId');
      const updated = await StudentService.updateStudent(
        studentId,
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

  public static async deleteStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = parseBigInt(req.params.studentId, 'studentId');
      const result = await StudentService.deleteStudent(studentId, (req as any).user);

      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getStudentSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = parseBigInt(req.params.studentId, 'studentId');
      const { cursor, limit } = parseCursorLimit(req.query.cursor, req.query.limit);

      const result = await StudentService.getStudentSubmissions(
        studentId,
        (req as any).user,
        cursor,
        limit
      );

      res.status(200).json({
        status: 'success',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getStudentProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = parseBigInt((req as any).user.userId, 'userId');
      const profile = await StudentService.getStudentProfile(studentId);

      res.status(200).json({
        status: 'success',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
}
