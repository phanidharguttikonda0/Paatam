import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import {
  analyticsOverviewQuerySchema,
  analyticsStudentsQuerySchema,
} from '../schemas/analytics.schema';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);
router.use(requireRole([UserRole.TEACHER, UserRole.BRANCH_ADMIN, UserRole.CORPORATE_ADMIN]));

// GET /api/analytics/overview - Overall metrics, pass rates, grade distribution, subject averages
router.get('/overview', validate(analyticsOverviewQuerySchema), AnalyticsController.getOverview);

// GET /api/analytics/students - Per-student performance metrics and grades
router.get('/students', validate(analyticsStudentsQuerySchema), AnalyticsController.getStudents);

export default router;
