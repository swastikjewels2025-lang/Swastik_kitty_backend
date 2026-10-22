import { Router } from 'express';
import { getCoinsCatalogController } from '../controllers/coin.controller.js';

const router = Router();

// Public endpoint for coins catalog
router.get('/', getCoinsCatalogController);

export default router;
