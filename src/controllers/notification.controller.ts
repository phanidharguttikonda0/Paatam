import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';

export class NotificationController {
  /**
   * GET /api/notifications
   */
  public static async listNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const result = await NotificationService.listNotifications(user, req.query);

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
   * POST /api/notifications/test
   */
  public static async sendTestNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const data = await NotificationService.sendTestNotification(user, req.body);

      res.status(200).json({
        status: 'success',
        message: 'Test notification dispatched successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
