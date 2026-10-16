import { Request, Response, NextFunction } from 'express';
import { StudentPortalService } from '../services/studentPortal.service';

export class StudentPortalController {
  public static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const result = await StudentPortalService.getDashboard(user.userId);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const status = req.query.status as string | undefined;
      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      const result = await StudentPortalService.getAssignments(user.userId, status, cursor, limit);
      res.status(200).json({
        status: 'success',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAssignmentDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const assignmentId = req.params.id as string;
      const result = await StudentPortalService.getAssignmentDetails(user.userId, assignmentId);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async submitAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const assignmentId = req.params.id as string;
      const result = await StudentPortalService.submitAssignment(user.userId, assignmentId, req.body);
      res.status(201).json({
        status: 'success',
        message: 'Answer sheets submitted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getSubmissionScorecard(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const submissionId = req.params.id as string;
      const result = await StudentPortalService.getSubmissionScorecard(user.userId, submissionId);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const result = await StudentPortalService.getNotifications(user.userId);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
