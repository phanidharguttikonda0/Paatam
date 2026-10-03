import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/send-otp
router.post('/send-otp', AuthController.sendOtp);

// POST /api/auth/verify-otp
router.post('/verify-otp', AuthController.verifyOtp);

export default router;
