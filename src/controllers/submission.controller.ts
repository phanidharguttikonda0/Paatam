import { Request, Response, NextFunction } from 'express';
import { SubmissionService } from '../services/submission.service';

export class SubmissionController {
  /**
   * GET /api/assignments/:id/submissions
   */
  public static async getAssignmentSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const assignmentId = req.params.id as string;
      const result = await SubmissionService.getAssignmentSubmissions(user, assignmentId, req.query as any);

      res.status(200).json({
        status: 'success',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/submissions/:id
   */
  public static async getSubmissionById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const submissionId = req.params.id as string;
      const result = await SubmissionService.getSubmissionById(user, submissionId);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/submissions/:id/approve
   */
  public static async approveSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const submissionId = req.params.id as string;
      const result = await SubmissionService.approveSubmission(user, submissionId, req.body);

      res.status(200).json({
        status: 'success',
        message: 'Submission approved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/submissions/:id/override
   */
  public static async overrideSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const submissionId = req.params.id as string;
      const result = await SubmissionService.overrideSubmission(user, submissionId, req.body);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/submissions/bulk
   */
  public static async bulkUploadSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const result = await SubmissionService.bulkUploadSubmissions(user, req.body);

      res.status(202).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/submissions/batch/:jobId
   */
  public static async getBatchJobStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const jobId = req.params.jobId as string;
      const result = await SubmissionService.getBatchJobStatus(user, jobId);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
