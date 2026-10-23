import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';

export class AnalyticsController {
  /**
   * GET /api/analytics/overview
   */
  public static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const data = await AnalyticsService.getOverview(user, req.query);

      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/students
   */
  public static async getStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const result = await AnalyticsService.getStudentsAnalytics(user, req.query);

      res.status(200).json({
        status: 'success',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }
}
