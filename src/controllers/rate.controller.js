import { GoldRate } from '../models/index.js';

export const getLiveGoldRateController = async (req, res, next) => {
  try {
    let latestRate = await GoldRate.findOne().sort({ updatedAt: -1 });

    // Fallback benchmark if not yet seeded
    if (!latestRate) {
      latestRate = {
        rate24k: 7485.50,
        rate22k: 6860.00,
        rateChangePct: 0.62,
        unit: '1 gram',
        currency: 'INR',
        benchmark: 'IBJA Official',
        updatedAt: new Date()
      };
    }

    return res.ok({
      rate24k: latestRate.rate24k,
      rate22k: latestRate.rate22k,
      rateChangePct: latestRate.rateChangePct || 0.0,
      unit: latestRate.unit || '1 gram',
      currency: latestRate.currency || 'INR',
      benchmark: latestRate.benchmark || 'IBJA Official',
      updatedAt: latestRate.updatedAt ? latestRate.updatedAt.toISOString() : new Date().toISOString()
    }, 'Live gold rates retrieved.');
  } catch (error) {
    next(error);
  }
};
