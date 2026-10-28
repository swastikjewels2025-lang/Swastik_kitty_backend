import { Scheme, Membership } from '../models/index.js';
import { calculateDynamicEmi } from '../services/emi.service.js';
import { synthesizeDashboard, synthesizeAllDashboards } from '../services/dashboard.service.js';

export const joinSchemeController = async (req, res, next) => {
  try {
    const { schemeId, joinedAtMonth = 1, selectedNumber, selectedNumbers } = req.body;
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

    // Normalize selected numbers (support both array `selectedNumbers` and single `selectedNumber`)
    let numbersToEnroll = null;
    if (Array.isArray(selectedNumbers) && selectedNumbers.length > 0) {
      numbersToEnroll = selectedNumbers.map(n => parseInt(n, 10));
    } else if (selectedNumber !== undefined && selectedNumber !== null) {
      numbersToEnroll = [parseInt(selectedNumber, 10)];
    }

    // Enforce max 10 slots
    if (numbersToEnroll && numbersToEnroll.length > 10) {
      return res.fail(
        'A maximum of 10 slots can be selected per plan enrollment.',
        400,
        'MAX_SLOTS_EXCEEDED'
      );
    }

    // 2. Prevent duplicate active enrollment when no specific slot is selected
    if (!numbersToEnroll) {
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
    }

    const schemeCheck = await Scheme.findById(schemeId);
    if (!schemeCheck || schemeCheck.status !== 'OPEN') {
      return res.fail('This scheme is not open for enrollment.', 400, 'SCHEME_NOT_OPEN');
    }

    const totalSlots = schemeCheck.totalSlots || schemeCheck.maxCapacity || 50;

    // Validate numbers if provided
    if (numbersToEnroll) {
      // Check duplicates within the requested array
      const uniqueRequested = new Set(numbersToEnroll);
      if (uniqueRequested.size !== numbersToEnroll.length) {
        return res.fail('Duplicate slot numbers in selection.', 400, 'DUPLICATE_SELECTION');
      }

      for (const num of numbersToEnroll) {
        if (isNaN(num) || num < 1 || num > totalSlots) {
          return res.fail(
            `Selected kitty number must be between 1 and ${totalSlots}.`,
            400,
            'INVALID_KITTY_NUMBER',
            { field: 'selectedNumbers' }
          );
        }
      }

      // Check if any requested slot is already taken in DB
      const alreadyTaken = await Membership.find({
        schemeId,
        tokenNumber: { $in: numbersToEnroll }
      }).select('tokenNumber');

      if (alreadyTaken.length > 0) {
        const takenNumbers = alreadyTaken.map(m => m.tokenNumber);
        return res.fail(
          `Kitty number(s) #${takenNumbers.join(', #')} already taken. Please choose another slot.`,
          409,
          'NUMBER_ALREADY_TAKEN',
          { field: 'selectedNumbers', takenNumbers }
        );
      }
    }

    const slotsCount = numbersToEnroll ? numbersToEnroll.length : 1;

    // 3. Atomically check capacity and increment member count
    const scheme = await Scheme.findOneAndUpdate(
      { _id: schemeId, status: 'OPEN', $expr: { $lte: [{ $add: ['$currentMembers', slotsCount] }, '$maxCapacity'] } },
      { $inc: { currentMembers: slotsCount } },
      { returnDocument: 'after' }
    );

    if (!scheme) {
      return res.fail(
        'This scheme is currently at maximum capacity or does not have enough remaining slots.',
        400,
        'SCHEME_CAPACITY_FULL'
      );
    }

    let finalNumbers = [];
    if (numbersToEnroll) {
      finalNumbers = numbersToEnroll;
    } else {
      // Find lowest available number from 1 to totalSlots
      const takenMemberships = await Membership.find({ schemeId }).select('tokenNumber kittyNumber');
      const takenSet = new Set(takenMemberships.map(m => m.kittyNumber || m.tokenNumber));
      for (let i = 1; i <= totalSlots; i++) {
        if (!takenSet.has(i)) {
          finalNumbers.push(i);
          break;
        }
      }
      if (finalNumbers.length === 0) {
        finalNumbers.push(scheme.currentMembers);
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

    // 5. Create Membership record(s)
    const createdMemberships = [];
    for (const chosenNumber of finalNumbers) {
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
      createdMemberships.push(membership);
    }

    const primaryMembership = createdMemberships[0];

    return res.created({
      membership: {
        id: primaryMembership._id.toString(),
        schemeId: scheme._id.toString(),
        schemeName: scheme.name,
        tokenNumber: primaryMembership.tokenNumber,
        kittyNumber: primaryMembership.kittyNumber || primaryMembership.tokenNumber,
        chitToken: primaryMembership.chitToken,
        customMonthlyEmi: primaryMembership.customMonthlyEmi,
        targetAmount: scheme.targetAmount,
        totalPaidAmount: primaryMembership.totalPaidAmount,
        status: primaryMembership.status,
        joinedAtMonth: primaryMembership.joinedAtMonth
      },
      memberships: createdMemberships.map(m => ({
        id: m._id.toString(),
        schemeId: scheme._id.toString(),
        schemeName: scheme.name,
        tokenNumber: m.tokenNumber,
        kittyNumber: m.kittyNumber || m.tokenNumber,
        chitToken: m.chitToken,
        customMonthlyEmi: m.customMonthlyEmi,
        targetAmount: scheme.targetAmount,
        totalPaidAmount: m.totalPaidAmount,
        status: m.status,
        joinedAtMonth: m.joinedAtMonth
      })),
      totalSlotsEnrolled: createdMemberships.length,
      totalMonthlyEmi: emiDetails.customMonthlyEmi * createdMemberships.length
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
