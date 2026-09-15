import { Router } from 'express';
import { getActiveSchemesController, createSchemeController } from '../controllers/scheme.controller.js';
import { authGuard } from '../middleware/authGuard.js';
import { roleGuard } from '../middleware/roleGuard.js';

const router = Router();

// Public / Customer endpoint
router.get('/active', getActiveSchemesController);

// Admin-only endpoint
router.post('/', authGuard, roleGuard('ADMIN', 'SUPER_ADMIN'), createSchemeController);

export default router;
