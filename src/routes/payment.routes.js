import { Router } from 'express';
import { 
  initiatePaymentController, 
  getPaymentStatusController, 
  paymentWebhookController,
  requestCashPickupController,
  settleFullController
} from '../controllers/payment.controller.js';
import { authGuard } from '../middleware/authGuard.js';

const router = Router();

router.post('/initiate', authGuard, initiatePaymentController);
router.post('/cash-pickup-request', authGuard, requestCashPickupController);
router.post('/cash-pickup', authGuard, requestCashPickupController);
router.post('/settle-full', authGuard, settleFullController);
router.get('/status/:orderId', authGuard, getPaymentStatusController);
router.post('/webhook', paymentWebhookController);

export default router;

