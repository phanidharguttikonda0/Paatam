import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
import { StudentPortalController } from '../controllers/studentPortal.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import {
  studentAssignmentsQuerySchema,
  submitAssignmentSchema,
} from '../schemas/studentPortal.schema';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);
router.use(requireRole([UserRole.STUDENT]));

// GET /api/student/profile
router.get('/profile', StudentController.getStudentProfile);

// GET /api/student/dashboard - Student landing dashboard
router.get('/dashboard', StudentPortalController.getDashboard);

// GET /api/student/assignments - Filterable assignment list
router.get(
  '/assignments',
  validate(studentAssignmentsQuerySchema),
  StudentPortalController.getAssignments
);

// GET /api/student/assignments/:id - Student test details and question paper
router.get('/assignments/:id', StudentPortalController.getAssignmentDetails);

// POST /api/student/assignments/:id/submit - Submit answer sheets
router.post(
  '/assignments/:id/submit',
  validate(submitAssignmentSchema),
  StudentPortalController.submitAssignment
);

// GET /api/student/submissions/:id - View graded scorecard and feedback
router.get('/submissions/:id', StudentPortalController.getSubmissionScorecard);

// GET /api/student/notifications - Notification feed
router.get('/notifications', StudentPortalController.getNotifications);

export default router;
