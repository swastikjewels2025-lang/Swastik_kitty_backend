import { Router } from 'express';
import { 
  recordCashPaymentController, 
  recordDrawWinnerController, 
  updateDailyGoldRateController, 
  reviewKycController 
} from '../controllers/admin.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { roleGuard } from '../middleware/roleGuard.js';

const router = Router();

// All admin routes strictly require authentication and ADMIN / SUPER_ADMIN role
router.use(authGuard, roleGuard('ADMIN', 'SUPER_ADMIN'));

router.post('/payments/record-cash', recordCashPaymentController);
router.post('/draw/record-winner', recordDrawWinnerController);
router.post('/rates/gold', updateDailyGoldRateController);
router.patch('/kyc/:userId', reviewKycController);

export default router;
