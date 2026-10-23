import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import {
  listNotificationsQuerySchema,
  testNotificationSchema,
} from '../schemas/notification.schema';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);

// GET /api/notifications - List notification logs (parents, students, system alerts)
router.get(
  '/',
  requireRole([UserRole.TEACHER, UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN, UserRole.STUDENT]),
  validate(listNotificationsQuerySchema),
  NotificationController.listNotifications
);

// POST /api/notifications/test - Trigger test SMS, WhatsApp, or Email notification
router.post(
  '/test',
  requireRole([UserRole.TEACHER, UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]),
  validate(testNotificationSchema),
  NotificationController.sendTestNotification
);

export default router;
