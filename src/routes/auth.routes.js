import { Router } from 'express';
import { 
  sendOtpController, 
  verifyOtpController, 
  logoutController 
} from '../controllers/auth.controller.js';
import { authGuard } from '../middleware/authGuard.js';

const router = Router();

router.post('/send-otp', sendOtpController);
router.post('/verify-otp', verifyOtpController);
router.post('/logout', authGuard, logoutController);

export default router;
