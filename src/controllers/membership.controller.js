import { Scheme, Membership } from '../models/index.js';
import { calculateDynamicEmi } from '../services/emi.service.js';
import { synthesizeDashboard, synthesizeAllDashboards } from '../services/dashboard.service.js';

export const joinSchemeController = async (req, res, next) => {
  try {
    const { schemeId, joinedAtMonth = 1, selectedNumber } = req.body;
    const userId = req.user._id;

    if (!schemeId) {
      return res.fail('Scheme ID is required.', 400, 'VALIDATION_ERROR', { field: 'schemeId' });
    }

    // 1. Compliance check: User must have KYC submitted or verified, or dev mode
    const isKycSubmitted = req.user.kyc?.isVerified || req.user.kyc?.status === 'PENDING' || req.user.kyc?.status === 'VERIFIED';
    if (!isKycSubmitted && process.env.NODE_ENV === 'production') {
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

    // 3. Atomically check capacity and increment member count
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

    const totalSlots = scheme.totalSlots || 50;
    let chosenNumber;

    if (selectedNumber !== undefined && selectedNumber !== null) {
      const parsedNumber = parseInt(selectedNumber, 10);
      if (isNaN(parsedNumber) || parsedNumber < 1 || parsedNumber > totalSlots) {
        // Rollback capacity increment
        await Scheme.findByIdAndUpdate(schemeId, { $inc: { currentMembers: -1 } });
        return res.fail(
          `Selected kitty number must be between 1 and ${totalSlots}.`,
          400,
          'INVALID_KITTY_NUMBER',
          { field: 'selectedNumber' }
        );
      }

      // Check if number is already taken
      const isTaken = await Membership.findOne({ schemeId, tokenNumber: parsedNumber });
      if (isTaken) {
        // Rollback capacity increment
        await Scheme.findByIdAndUpdate(schemeId, { $inc: { currentMembers: -1 } });
        return res.fail(
          'This kitty number was just taken by another member. Please choose another number.',
          409,
          'NUMBER_ALREADY_TAKEN',
          { field: 'selectedNumber' }
        );
      }
      chosenNumber = parsedNumber;
    } else {
      // Find lowest available number from 1 to totalSlots
      const takenMemberships = await Membership.find({ schemeId }).select('tokenNumber kittyNumber');
      const takenSet = new Set(takenMemberships.map(m => m.kittyNumber || m.tokenNumber));
      for (let i = 1; i <= totalSlots; i++) {
        if (!takenSet.has(i)) {
          chosenNumber = i;
          break;
        }
      }
      if (!chosenNumber) {
        chosenNumber = scheme.currentMembers;
      }
    }

    // 4. Calculate Dynamic EMI (Late Joiner Math)
    const emiDetails = calculateDynamicEmi({
      targetAmount: scheme.targetAmount,
      durationMonths: scheme.durationMonths,
      joinedAtMonth: parseInt(joinedAtMonth, 10) || 1,
      hasBonusMonth: scheme.hasBonusMonth,
      bonusAmount: scheme.bonusAmount
    });

    // 5. Create Membership record
    const membership = await Membership.create({
      userId,
      schemeId: scheme._id,
      tokenNumber: chosenNumber,
      kittyNumber: chosenNumber,
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
        kittyNumber: membership.kittyNumber || membership.tokenNumber,
        chitToken: membership.chitToken,
        customMonthlyEmi: membership.customMonthlyEmi,
        targetAmount: membership.targetAmount,
        totalPaidAmount: membership.totalPaidAmount,
        status: membership.status,
        joinedAtMonth: membership.joinedAtMonth
      }
    }, 'Enrolled in scheme successfully.');
  } catch (error) {
    if (error.code === 11000) {
      await Scheme.findByIdAndUpdate(req.body.schemeId, { $inc: { currentMembers: -1 } });
      return res.fail(
        'This kitty number was just taken by another member. Please choose another number.',
        409,
        'NUMBER_ALREADY_TAKEN'
      );
    }
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

export const getMySchemesController = async (req, res, next) => {
  try {
    const dashboards = await synthesizeAllDashboards(req.user._id);
    return res.ok(dashboards, 'Active scheme memberships retrieved.');
  } catch (error) {
    next(error);
  }
};
