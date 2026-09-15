import { Router } from 'express';
import { 
  initiatePaymentController, 
  getPaymentStatusController, 
  paymentWebhookController 
} from '../controllers/payment.controller.js';
import { authGuard } from '../middleware/authGuard.js';

const router = Router();

router.post('/initiate', authGuard, initiatePaymentController);
router.get('/status/:orderId', authGuard, getPaymentStatusController);
router.post('/webhook', paymentWebhookController);

export default router;
