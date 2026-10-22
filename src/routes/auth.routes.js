import { Router } from 'express';
import { 
  sendOtpController, 
  verifyOtpController, 
  logoutController,
  googleAuthExchangeController,
  adminLoginController
} from '../controllers/auth.controller.js';
import { authGuard } from '../middleware/authGuard.js';

const router = Router();

router.post('/admin-login', adminLoginController);
router.post('/send-otp', sendOtpController);
router.post('/verify-otp', verifyOtpController);
router.post('/google', googleAuthExchangeController);
router.post('/logout', authGuard, logoutController);

export default router;

