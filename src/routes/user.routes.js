import { Router } from 'express';
import { submitKycController, getProfileController } from '../controllers/user.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { kycUpload } from '../services/kyc.service.js';

const router = Router();

router.post('/kyc', authGuard, kycUpload.single('file'), submitKycController);
router.get('/profile', authGuard, getProfileController);

export default router;
