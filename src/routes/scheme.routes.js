import { Router } from 'express';
import { 
  getActiveSchemesController, 
  createSchemeController,
  getSchemeNumbersController
} from '../controllers/scheme.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { roleGuard } from '../middleware/roleGuard.js';

const router = Router();

// Public / Customer endpoint
router.get('/active', getActiveSchemesController);
router.get('/:id/numbers', getSchemeNumbersController);

// Admin-only endpoint
router.post('/', authGuard, roleGuard('ADMIN', 'SUPER_ADMIN'), createSchemeController);

export default router;

