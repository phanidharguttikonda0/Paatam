import { Router } from 'express';
import { TeacherController } from '../controllers/teacher.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);
router.use(requireRole([UserRole.TEACHER]));

// GET /api/teacher/profile
router.get('/profile', TeacherController.getTeacherProfile);

// GET /api/teacher/dashboard
router.get('/dashboard', TeacherController.getTeacherDashboard);

// GET /api/teacher/sections/:sectionId/subjects
router.get('/sections/:sectionId/subjects', TeacherController.getTeacherSectionSubjects);

export default router;
