import { Scheme, Membership } from '../models/index.js';
import { calculateDynamicEmi } from '../services/emi.service.js';
import { synthesizeDashboard } from '../services/dashboard.service.js';

export const joinSchemeController = async (req, res, next) => {
  try {
    const { schemeId, joinedAtMonth = 1 } = req.body;
    const userId = req.user._id;

    if (!schemeId) {
      return res.fail('Scheme ID is required.', 400, 'VALIDATION_ERROR', { field: 'schemeId' });
    }

    // 1. Compliance check: User must have verified KYC (or pending in test mode)
    if (!req.user.kyc?.isVerified && process.env.NODE_ENV !== 'test') {
      return res.fail(
        'Statutory KYC verification is required before joining a gold savings scheme.',
        403,
        'KYC_REQUIRED'
      );
    }

    // 2. Prevent duplicate active enrollment in the same scheme
    const existingMembership = await Membership.findOne({
      userId,
      schemeId,
      status: { $in: ['ACTIVE', 'WINNER'] }
    });

    if (existingMembership) {
      return res.fail(
        'You already have an active membership enrolled in this scheme.',
        409,
        'DUPLICATE_MEMBERSHIP'
      );
    }

    // 3. Atomically check capacity and increment member count (Concurrently safe)
    const scheme = await Scheme.findOneAndUpdate(
      { _id: schemeId, status: 'OPEN', $expr: { $lt: ['$currentMembers', '$maxCapacity'] } },
      { $inc: { currentMembers: 1 } },
      { returnDocument: 'after' }
    );

    if (!scheme) {
      return res.fail(
        'This scheme is currently at maximum capacity or no longer open for enrollment.',
        400,
        'SCHEME_CAPACITY_FULL'
      );
    }

    // 4. Token number assigned sequentially
    const tokenNumber = scheme.currentMembers;

    // 5. Calculate Dynamic EMI (Late Joiner Math)
    const emiDetails = calculateDynamicEmi({
      targetAmount: scheme.targetAmount,
      durationMonths: scheme.durationMonths,
      joinedAtMonth: parseInt(joinedAtMonth, 10) || 1,
      hasBonusMonth: scheme.hasBonusMonth,
      bonusAmount: scheme.bonusAmount
    });

    // 6. Create Membership record
    const membership = await Membership.create({
      userId,
      schemeId: scheme._id,
      tokenNumber,
      customMonthlyEmi: emiDetails.customMonthlyEmi,
      targetAmount: scheme.targetAmount,
      totalPaidAmount: 0,
      accumulatedGoldGrams: 0,
      status: 'ACTIVE',
      joinedAtMonth: emiDetails.joinedAtMonth
    });

    return res.created({
      membership: {
        id: membership._id.toString(),
        schemeId: scheme._id.toString(),
        schemeName: scheme.name,
        tokenNumber: membership.tokenNumber,
        chitToken: membership.chitToken,
        customMonthlyEmi: membership.customMonthlyEmi,
        targetAmount: membership.targetAmount,
        totalPaidAmount: membership.totalPaidAmount,
        status: membership.status,
        joinedAtMonth: membership.joinedAtMonth
      }
    }, 'Enrolled in scheme successfully.');
  } catch (error) {
    next(error);
  }
};

export const getMyDashboardController = async (req, res, next) => {
  try {
    const dashboardData = await synthesizeDashboard(req.user._id);
    return res.ok(dashboardData, 'Dashboard data retrieved.');
  } catch (error) {
    next(error);
  }
};
