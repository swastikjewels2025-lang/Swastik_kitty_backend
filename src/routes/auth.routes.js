import { Router } from 'express';
import { 
  sendOtpController, 
  verifyOtpController, 
  logoutController,
  googleAuthExchangeController,
  appleAuthExchangeController,
  linkPhoneController,
  adminLoginController
} from '../controllers/auth.controller.js';
import { authGuard } from '../middleware/authGuard.js';

const router = Router();

router.post('/admin-login', adminLoginController);
router.post('/send-otp', sendOtpController);
router.post('/verify-otp', verifyOtpController);
router.post('/google', googleAuthExchangeController);
router.post('/apple', appleAuthExchangeController);
router.post('/link-phone', authGuard, linkPhoneController);
router.post('/logout', authGuard, logoutController);

export default router;

