import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../enums/role.enum';

const router = Router();

router.use(requireAuth);
router.use(requireRole([UserRole.STUDENT]));

// GET /api/student/profile
router.get('/profile', StudentController.getStudentProfile);

export default router;
