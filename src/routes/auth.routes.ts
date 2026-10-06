import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { adminLoginSchema } from '../schemas/admin.schema';

const router = Router();

// POST /api/auth/send-otp
router.post('/send-otp', AuthController.sendOtp);

// POST /api/auth/verify-otp
router.post('/verify-otp', AuthController.verifyOtp);

// POST /api/auth/corporate/login
router.post('/corporate/login', AuthController.corporateLoginRequest);

// POST /api/auth/corporate/verify
router.post('/corporate/verify', AuthController.corporateLoginVerify);

// POST /api/auth/admin/login
router.post('/admin/login', validate(adminLoginSchema), AuthController.adminLogin);

// POST /api/auth/admin/forgot-password
router.post('/admin/forgot-password', AuthController.adminForgotPassword);

// POST /api/auth/admin/reset-password
router.post('/admin/reset-password', AuthController.adminResetPassword);

export default router;
