import { Router } from 'express';
import { joinSchemeController, getMyDashboardController } from '../controllers/membership.controller.js';
import { authGuard } from '../middleware/authGuard.js';

const router = Router();

router.post('/join', authGuard, joinSchemeController);
router.get('/my-dashboard', authGuard, getMyDashboardController);

export default router;
