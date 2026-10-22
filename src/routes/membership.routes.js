import { Router } from 'express';
import { 
  joinSchemeController, 
  getMyDashboardController,
  getMySchemesController 
} from '../controllers/membership.controller.js';
import { authGuard } from '../middleware/authGuard.js';

const router = Router();

router.post('/join', authGuard, joinSchemeController);
router.get('/my-dashboard', authGuard, getMyDashboardController);
router.get('/my-schemes', authGuard, getMySchemesController);

export default router;
