import { Request, Response, NextFunction } from 'express';
import { AssignmentService } from '../services/assignment.service';

export class AssignmentController {
  public static async generateUploadUrls(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { section_id, files } = req.body;
      const result = await AssignmentService.generateUploadUrls(user, section_id, files);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async processAsync(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const result = await AssignmentService.processAsync(user, req.body);
      res.status(202).json({
        status: 'success',
        message: 'Assignment queued for OCR and dynamic model routing',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getPipelineStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const assignmentId = req.params.id as string;
      const result = await AssignmentService.getPipelineStatus(user, assignmentId);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createSync(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const result = await AssignmentService.createSync(user, req.body);
      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async publishAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const result = await AssignmentService.publishAssignment(user, req.body);
      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async listAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const filters = {
        section_id: req.query.section_id as string | undefined,
        class_subject_id: req.query.class_subject_id as string | undefined,
        cursor: req.query.cursor as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };
      const result = await AssignmentService.listAssignments(user, filters);
      res.status(200).json({
        status: 'success',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAssignmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const assignmentId = req.params.id as string;
      const result = await AssignmentService.getAssignmentById(user, assignmentId);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const assignmentId = req.params.id as string;
      const result = await AssignmentService.deleteAssignment(user, assignmentId);
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
