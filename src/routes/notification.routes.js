import { Router } from 'express';
import { 
  getNotificationsController, 
  markNotificationReadController, 
  markAllNotificationsReadController 
} from '../controllers/notification.controller.js';
import { authGuard } from '../middleware/authGuard.js';

const router = Router();

router.use(authGuard);

router.get('/', getNotificationsController);
router.patch('/read-all', markAllNotificationsReadController);
router.patch('/:id/read', markNotificationReadController);

export default router;
