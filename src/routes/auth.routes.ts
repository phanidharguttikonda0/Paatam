import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { 
  adminLoginSchema, 
  adminForgotPasswordSchema, 
  adminResetPasswordSchema 
} from '../schemas/admin.schema';
import {
  teacherLoginSchema,
  teacherForgotPasswordSchema,
  teacherResetPasswordSchema,
} from '../schemas/teacher.schema';
import {
  studentLoginSchema,
  studentForgotPasswordSchema,
  studentResetPasswordSchema,
} from '../schemas/student.schema';

const router = Router();

// POST /api/auth/send-otp
router.post('/send-otp', AuthController.sendOtp);

// POST /api/auth/verify-otp
router.post('/verify-otp', AuthController.verifyOtp);

// POST /api/auth/corporate/login
router.post('/corporate/login', AuthController.corporateLoginRequest);

// POST /api/auth/corporate/verify
router.post('/corporate/verify', AuthController.corporateLoginVerify);

// POST /api/auth/refresh
router.post('/refresh', AuthController.refreshToken);

// POST /api/auth/admin/login
router.post('/admin/login', validate(adminLoginSchema), AuthController.adminLogin);

// POST /api/auth/admin/forgot-password
router.post('/admin/forgot-password', validate(adminForgotPasswordSchema), AuthController.adminForgotPassword);

// POST /api/auth/admin/reset-password
router.post('/admin/reset-password', validate(adminResetPasswordSchema), AuthController.adminResetPassword);

// POST /api/auth/teacher/login
router.post('/teacher/login', validate(teacherLoginSchema), AuthController.teacherLogin);

// POST /api/auth/teacher/forgot-password
router.post('/teacher/forgot-password', validate(teacherForgotPasswordSchema), AuthController.teacherForgotPassword);

// POST /api/auth/teacher/reset-password
router.post('/teacher/reset-password', validate(teacherResetPasswordSchema), AuthController.teacherResetPassword);

// POST /api/auth/student/login
router.post('/student/login', validate(studentLoginSchema), AuthController.studentLogin);

// POST /api/auth/student/forgot-password
router.post('/student/forgot-password', validate(studentForgotPasswordSchema), AuthController.studentForgotPassword);

// POST /api/auth/student/reset-password
router.post('/student/reset-password', validate(studentResetPasswordSchema), AuthController.studentResetPassword);

export default router;
