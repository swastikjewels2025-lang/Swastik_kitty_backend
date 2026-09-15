import { Router } from 'express';
import { getLiveGoldRateController } from '../controllers/rate.controller.js';

const router = Router();

router.get('/gold', getLiveGoldRateController);

export default router;
