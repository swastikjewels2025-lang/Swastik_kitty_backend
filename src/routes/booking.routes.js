import { Router } from 'express';
import { 
  createBookingController, 
  getMyBookingsController,
  adminUpdateBookingStatusController 
} from '../controllers/booking.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { roleGuard } from '../middleware/roleGuard.js';

const router = Router();

router.post('/', authGuard, createBookingController);
router.get('/', authGuard, getMyBookingsController);
router.patch('/:id/status', authGuard, roleGuard('ADMIN', 'SUPER_ADMIN'), adminUpdateBookingStatusController);

export default router;
