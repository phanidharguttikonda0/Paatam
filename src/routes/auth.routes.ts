import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/send-otp
router.post('/send-otp', AuthController.sendOtp);

// POST /api/auth/verify-otp
router.post('/verify-otp', AuthController.verifyOtp);

// POST /api/auth/corporate/login
router.post('/corporate/login', AuthController.corporateLoginRequest);

// POST /api/auth/corporate/verify
router.post('/corporate/verify', AuthController.corporateLoginVerify);

export default router;
