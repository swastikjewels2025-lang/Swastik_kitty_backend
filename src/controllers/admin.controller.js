import { 
  Membership, 
  Payment, 
  GoldRate, 
  User, 
  Scheme, 
  CashPickupRequest, 
  Booking, 
  Notification 
} from '../models/index.js';
import { generateReceiptPdf } from '../services/receipt.service.js';

/**
 * Admin: Record counter cash installment collection
 */
export const recordCashPaymentController = async (req, res, next) => {
  try {
    const { membershipId, amount, monthFor } = req.body;

    if (!membershipId || !amount || !monthFor) {
      return res.fail('Membership ID, amount, and installment month are required.', 400, 'VALIDATION_ERROR');
    }

    const membership = await Membership.findById(membershipId).populate('schemeId');
    if (!membership) {
      return res.fail('Membership not found.', 404, 'MEMBERSHIP_NOT_FOUND');
    }

    // Check if month already paid
    const existing = await Payment.findOne({
      membershipId: membership._id,
      monthFor: parseInt(monthFor, 10),
      status: 'SUCCESS'
    });

    if (existing) {
      return res.fail(`Installment for Month ${monthFor} is already recorded as paid.`, 400, 'MONTH_ALREADY_PAID');
    }

    // Fetch benchmark rate
    const latestRate = await GoldRate.findOne().sort({ updatedAt: -1 });
    const rate24k = latestRate ? latestRate.rate24k : 7485.50;
    const goldGrams = parseFloat((amount / rate24k).toFixed(3));

    const transactionId = `TXN-CASH-${Date.now().toString().slice(-6)}`;
    const receiptUrl = `https://res.cloudinary.com/swastik/image/upload/receipts/rec_cash_${Date.now()}.pdf`;

    // 1. Create Payment
    const payment = await Payment.create({
      membershipId: membership._id,
      userId: membership.userId,
      amount: parseInt(amount, 10),
      monthFor: parseInt(monthFor, 10),
      paymentMethod: 'CASH',
      transactionId,
      goldRateAtPayment: rate24k,
      goldGrams,
      receiptUrl,
      status: 'SUCCESS',
      paidAt: new Date()
    });

    // 2. Increment Membership
    membership.totalPaidAmount += payment.amount;
    membership.accumulatedGoldGrams += goldGrams;
    await membership.save();

    // 3. Asynchronously trigger PDF generation
    const user = await User.findById(membership.userId);
    generateReceiptPdf({
      receiptId: payment._id.toString().slice(-6).toUpperCase(),
      customerName: user ? user.name : 'Valued Patron',
      customerPhone: user ? user.phone : '+91XXXXXXXXXX',
      chitToken: membership.chitToken,
      schemeName: membership.schemeId ? membership.schemeId.name : 'Swastik Suvarna Varsha',
      monthFor: payment.monthFor,
      amount: payment.amount,
      paymentMethod: 'CASH',
      transactionId,
      goldRateAtPayment: rate24k,
      goldGrams,
      totalPaidAmount: membership.totalPaidAmount,
      accumulatedGoldGrams: membership.accumulatedGoldGrams,
      paidAt: payment.paidAt
    }).catch(err => console.error('[Cash PDF Error]', err.message));

    return res.created({
      paymentId: payment._id.toString(),
      transactionId,
      receiptUrl,
      amount: payment.amount,
      monthFor: payment.monthFor,
      paymentMethod: 'CASH',
      status: 'SUCCESS'
    }, 'Cash payment recorded successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Confirm Doorstep Cash Pickup with Customer OTP
 */
export const confirmCashPickupController = async (req, res, next) => {
  try {
    const requestId = req.body.requestId || req.params.id;
    const verificationOtp = req.body.verificationOtp || req.body.otp;

    if (!requestId || !verificationOtp) {
      return res.fail('Request ID and customer verification OTP are required.', 400, 'VALIDATION_ERROR');
    }

    const { confirmCashPickup } = await import('../services/payment.service.js');
    const result = await confirmCashPickup({ requestId, verificationOtp });

    return res.ok(result, 'Doorstep cash pickup verified and payment ledger updated.');
  } catch (error) {
    if (error.statusCode) {
      return res.fail(error.message, error.statusCode, error.code);
    }
    next(error);
  }
};

/**
 * Admin: Monthly Lucky Draw Winner Selection
 */
export const recordDrawWinnerController = async (req, res, next) => {
  try {
    const { schemeId, tokenNumber, month } = req.body;

    if (!schemeId || !tokenNumber || !month) {
      return res.fail('Scheme ID, token number, and draw month are required.', 400, 'VALIDATION_ERROR');
    }

    const membership = await Membership.findOne({
      schemeId,
      tokenNumber: parseInt(tokenNumber, 10)
    }).populate('schemeId').populate('userId');

    if (!membership) {
      return res.fail(`No membership found with token #${tokenNumber} in this scheme.`, 404, 'MEMBER_NOT_FOUND');
    }

    membership.status = 'WINNER';
    membership.winMonth = parseInt(month, 10);
    await membership.save();

    console.log(`[WhatsApp Broadcast] Winner declared! Patron ${membership.userId.name} (Token ${membership.chitToken}) won Month ${month} draw!`);

    return res.ok({
      membershipId: membership._id.toString(),
      chitToken: membership.chitToken,
      tokenNumber: membership.tokenNumber,
      winnerName: membership.userId.name,
      winnerPhone: membership.userId.phone,
      schemeName: membership.schemeId.name,
      winMonth: membership.winMonth,
      status: membership.status
    }, 'Lucky draw winner declared and recorded.');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Set daily benchmark gold rates
 */
export const updateDailyGoldRateController = async (req, res, next) => {
  try {
    const { rate24k, rate22k, rateChangePct = 0.0, benchmark = 'IBJA Official' } = req.body;

    if (!rate24k || !rate22k) {
      return res.fail('24K and 22K per-gram rates are required.', 400, 'VALIDATION_ERROR');
    }

    const rate = await GoldRate.create({
      rate24k: parseFloat(rate24k),
      rate22k: parseFloat(rate22k),
      rateChangePct: parseFloat(rateChangePct),
      benchmark,
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    return res.created({
      rate24k: rate.rate24k,
      rate22k: rate.rate22k,
      rateChangePct: rate.rateChangePct,
      benchmark: rate.benchmark,
      updatedAt: rate.updatedAt.toISOString()
    }, 'Daily gold rates updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Review customer KYC compliance
 */
export const reviewKycController = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return res.fail('Status must be either VERIFIED or REJECTED.', 400, 'VALIDATION_ERROR');
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.fail('User not found.', 404, 'USER_NOT_FOUND');
    }

    user.kyc.status = status;
    user.kyc.isVerified = status === 'VERIFIED';
    user.kyc.verifiedAt = status === 'VERIFIED' ? new Date() : null;
    user.kyc.rejectionReason = status === 'REJECTED' ? (rejectionReason || 'Document unreadable.') : null;

    await user.save();

    return res.ok({
      userId: user._id.toString(),
      name: user.name,
      phone: user.phone,
      kyc: {
        status: user.kyc.status,
        isVerified: user.kyc.isVerified,
        verifiedAt: user.kyc.verifiedAt,
        rejectionReason: user.kyc.rejectionReason
      }
    }, `KYC review status updated to ${status}.`);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Dashboard Analytics & Key Metrics
 */
export const getAdminDashboardStatsController = async (req, res, next) => {
  try {
    const [
      totalPatrons,
      activeMemberships,
      totalRevenueResult,
      totalGoldResult,
      pendingKyc,
      pendingPickups,
      activeSchemes,
      latestRate,
      recentPayments,
      recentPendingKyc,
      recentPickups
    ] = await Promise.all([
      User.countDocuments({ role: 'CUSTOMER' }),
      Membership.countDocuments({ status: 'ACTIVE' }),
      Payment.aggregate([
        { $match: { status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$goldGrams' } } }
      ]),
      User.countDocuments({ 'kyc.status': 'PENDING' }),
      CashPickupRequest.countDocuments({ status: 'SCHEDULED' }),
      Scheme.countDocuments({ status: { $in: ['OPEN', 'ONGOING'] } }),
      GoldRate.findOne().sort({ updatedAt: -1 }),
      Payment.find({ status: 'SUCCESS' })
        .sort({ paidAt: -1, createdAt: -1 })
        .limit(6)
        .populate('userId', 'name phone')
        .populate({ path: 'membershipId', populate: { path: 'schemeId', select: 'name' } }),
      User.find({ 'kyc.status': 'PENDING' })
        .sort({ 'kyc.submittedAt': -1, createdAt: -1 })
        .limit(6)
        .select('name surname phone email kyc createdAt'),
      CashPickupRequest.find({ status: 'SCHEDULED' })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('userId', 'name phone')
        .populate('membershipId', 'chitToken tokenNumber')
    ]);

    const totalRevenue = totalRevenueResult[0]?.total || 0;
    const totalGoldGrams = parseFloat((totalGoldResult[0]?.total || 0).toFixed(3));

    return res.ok({
      metrics: {
        totalPatrons,
        activeMemberships,
        totalRevenue,
        totalGoldGrams,
        pendingKyc,
        pendingPickups,
        activeSchemes,
        currentRates: latestRate ? {
          rate24k: latestRate.rate24k,
          rate22k: latestRate.rate22k,
          rateChangePct: latestRate.rateChangePct,
          updatedAt: latestRate.updatedAt
        } : { rate24k: 7850, rate22k: 7195, rateChangePct: 0, updatedAt: new Date() }
      },
      recent: {
        payments: recentPayments,
        pendingKyc: recentPendingKyc,
        pickups: recentPickups
      }
    }, 'Admin dashboard statistics retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Users List with Search & Pagination
 */
export const getAdminUsersController = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const { search, kycStatus, role } = req.query;

    const filter = {};
    if (role) {
      filter.role = role;
    }
    if (kycStatus) {
      filter['kyc.status'] = kycStatus;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const totalUsers = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Attach membership count for each user
    const userIds = users.map(u => u._id);
    const membershipCounts = await Membership.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);
    const membershipCountMap = {};
    membershipCounts.forEach(m => {
      membershipCountMap[m._id.toString()] = m.count;
    });

    const enrichedUsers = users.map(u => ({
      ...u,
      membershipCount: membershipCountMap[u._id.toString()] || 0
    }));

    return res.ok({
      users: enrichedUsers,
      pagination: {
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit) || 1
      }
    }, 'Users list retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get Detailed User Profile with Memberships & History
 */
export const getAdminUserDetailController = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.fail('User not found.', 404, 'USER_NOT_FOUND');
    }

    const [memberships, payments, pickups, bookings] = await Promise.all([
      Membership.find({ userId: user._id }).populate('schemeId'),
      Payment.find({ userId: user._id }).sort({ createdAt: -1 }),
      CashPickupRequest.find({ userId: user._id }).sort({ createdAt: -1 }),
      Booking.find({ userId: user._id }).sort({ createdAt: -1 })
    ]);

    return res.ok({
      user,
      memberships,
      payments,
      pickups,
      bookings
    }, 'User profile and history retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Pending KYC Queue
 */
export const getPendingKycListController = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const filter = { 'kyc.status': 'PENDING' };
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ 'kyc.submittedAt': -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.ok({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    }, 'Pending KYC verification list retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Payments Ledger with Filtering & Search
 */
export const getAdminPaymentsController = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const { status, paymentMethod, search, membershipId, userId } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (membershipId) filter.membershipId = membershipId;
    if (userId) filter.userId = userId;
    if (search) {
      filter.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { orderId: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name phone email')
      .populate({ path: 'membershipId', populate: { path: 'schemeId', select: 'name targetAmount monthlyInstallment' } });

    return res.ok({
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    }, 'Payments ledger retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Cash Pickup Requests
 */
export const getAdminPickupsController = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const { status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const total = await CashPickupRequest.countDocuments(filter);
    const pickups = await CashPickupRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name phone')
      .populate({ path: 'membershipId', populate: { path: 'schemeId', select: 'name' } });

    return res.ok({
      pickups,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    }, 'Cash pickup requests retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Schemes List with Live Enrolled Count
 */
export const getAdminSchemesController = async (req, res, next) => {
  try {
    const schemes = await Scheme.find().sort({ createdAt: -1 }).lean();
    
    const schemeIds = schemes.map(s => s._id);
    const memberCounts = await Membership.aggregate([
      { $match: { schemeId: { $in: schemeIds } } },
      { $group: { _id: '$schemeId', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    memberCounts.forEach(m => { countMap[m._id.toString()] = m.count; });

    const enriched = schemes.map(s => ({
      ...s,
      enrolledCount: countMap[s._id.toString()] || 0
    }));

    return res.ok(enriched, 'Schemes catalog retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update Scheme
 */
export const updateAdminSchemeController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      'name', 'targetAmount', 'monthlyInstallment', 'durationMonths',
      'maxCapacity', 'totalSlots', 'status', 'benefits', 'bannerImageUrl',
      'hasBonusMonth', 'bonusAmount'
    ];
    
    const update = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    });

    const scheme = await Scheme.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!scheme) {
      return res.fail('Scheme not found.', 404, 'SCHEME_NOT_FOUND');
    }

    return res.ok(scheme, 'Scheme updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete or Close Scheme
 */
export const deleteAdminSchemeController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const membershipCount = await Membership.countDocuments({ schemeId: id });
    if (membershipCount > 0) {
      const scheme = await Scheme.findByIdAndUpdate(id, { status: 'COMPLETED' }, { new: true });
      return res.ok(scheme, 'Scheme has active members; status transitioned to COMPLETED.');
    }

    await Scheme.findByIdAndDelete(id);
    return res.ok({ id }, 'Scheme deleted successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Memberships List
 */
export const getAdminMembershipsController = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { schemeId, status, search } = req.query;

    const filter = {};
    if (schemeId) filter.schemeId = schemeId;
    if (status) filter.status = status;

    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = matchingUsers.map(u => u._id);
      filter.userId = { $in: userIds };
    }

    const total = await Membership.countDocuments(filter);
    const memberships = await Membership.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name phone email kyc')
      .populate('schemeId', 'name monthlyInstallment targetAmount durationMonths');

    return res.ok({
      memberships,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    }, 'Memberships retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Bullion Bookings List
 */
export const getAdminBookingsController = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const { status, category } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const total = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name phone email');

    return res.ok({
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    }, 'Bullion bookings retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update Booking Status
 */
export const updateAdminBookingStatusController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['CONFIRMED', 'DISPATCHED', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.fail(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400, 'INVALID_STATUS');
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.fail('Booking not found.', 404, 'BOOKING_NOT_FOUND');
    }

    booking.status = status;
    if (notes) booking.notes = notes;
    await booking.save();

    return res.ok(booking, `Booking status updated to ${status}.`);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Eligible Draw Participants
 */
export const getDrawEligibleMembersController = async (req, res, next) => {
  try {
    const { schemeId } = req.params;
    const scheme = await Scheme.findById(schemeId);
    if (!scheme) {
      return res.fail('Scheme not found.', 404, 'SCHEME_NOT_FOUND');
    }

    const members = await Membership.find({
      schemeId,
      status: 'ACTIVE'
    })
      .populate('userId', 'name phone')
      .sort({ tokenNumber: 1 });

    return res.ok({
      schemeId,
      schemeName: scheme.name,
      totalEligible: members.length,
      members
    }, 'Eligible draw participants retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Broadcast In-App Notification
 */
export const broadcastNotificationController = async (req, res, next) => {
  try {
    const { title, body, type = 'GENERAL', actionRoute, userIds } = req.body;

    if (!title || !body) {
      return res.fail('Notification title and body are required.', 400, 'VALIDATION_ERROR');
    }

    let targetUserIds = [];
    if (Array.isArray(userIds) && userIds.length > 0) {
      targetUserIds = userIds;
    } else {
      const customers = await User.find({ role: 'CUSTOMER' }).select('_id');
      targetUserIds = customers.map(c => c._id);
    }

    if (targetUserIds.length === 0) {
      return res.ok({ sentCount: 0 }, 'No recipients found for broadcast.');
    }

    const docs = targetUserIds.map(uid => ({
      userId: uid,
      title,
      body,
      type,
      actionRoute: actionRoute || null,
      isRead: false,
      createdAt: new Date()
    }));

    await Notification.insertMany(docs);

    return res.created({
      sentCount: docs.length,
      title,
      body,
      type
    }, `Broadcast notification dispatched to ${docs.length} patron(s).`);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Manually book/allocate any slot in a scheme for a patron
 */
export const adminManualEnrollController = async (req, res, next) => {
  try {
    const { schemeId, tokenNumber, phone, name } = req.body;

    if (!schemeId || !tokenNumber || !phone) {
      return res.fail('Scheme ID, token number, and patron phone number are required.', 400, 'VALIDATION_ERROR');
    }

    const scheme = await Scheme.findById(schemeId);
    if (!scheme) {
      return res.fail('Scheme not found.', 404, 'SCHEME_NOT_FOUND');
    }

    const totalSlots = scheme.totalSlots || 50;
    const parsedNumber = parseInt(tokenNumber, 10);
    if (isNaN(parsedNumber) || parsedNumber < 1 || parsedNumber > totalSlots) {
      return res.fail(`Token number must be between 1 and ${totalSlots}.`, 400, 'INVALID_TOKEN_NUMBER');
    }

    // Check if slot is already occupied
    const existing = await Membership.findOne({ 
      schemeId, 
      $or: [{ tokenNumber: parsedNumber }, { kittyNumber: parsedNumber }] 
    });
    if (existing) {
      return res.fail(`Chit slot #${parsedNumber} is already occupied.`, 409, 'SLOT_ALREADY_OCCUPIED');
    }

    // Find or create patron user
    let cleanPhone = String(phone).trim();
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`;
    }

    let user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      user = await User.create({
        phone: cleanPhone,
        name: name?.trim() || 'Patron',
        role: 'PATRON',
        kyc: {
          status: 'VERIFIED',
          isVerified: true,
          documentType: 'AADHAAR',
          documentNumberMasked: 'XXXX XXXX ' + cleanPhone.slice(-4)
        }
      });
    } else {
      if (name && name.trim() && (user.name === 'Patron' || !user.name)) {
        user.name = name.trim();
        await user.save();
      }
    }

    // Create Membership
    const chitToken = `#SW-${String(parsedNumber).padStart(3, '0')}`;
    const membership = await Membership.create({
      userId: user._id,
      schemeId: scheme._id,
      tokenNumber: parsedNumber,
      kittyNumber: parsedNumber,
      chitToken,
      customMonthlyEmi: scheme.monthlyInstallment,
      targetAmount: scheme.targetAmount,
      totalPaidAmount: 0,
      accumulatedGoldGrams: 0,
      status: 'ACTIVE',
      joinedAtMonth: 1
    });

    // Increment currentMembers count
    await Scheme.findByIdAndUpdate(scheme._id, { $inc: { currentMembers: 1 } });

    return res.created({
      membership: {
        id: membership._id.toString(),
        schemeId: scheme._id.toString(),
        schemeName: scheme.name,
        tokenNumber: membership.tokenNumber,
        kittyNumber: membership.kittyNumber || membership.tokenNumber,
        chitToken: membership.chitToken,
        status: membership.status,
        user: {
          id: user._id.toString(),
          name: user.name,
          phone: user.phone
        }
      }
    }, `Slot #${parsedNumber} allocated to ${user.name} successfully.`);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update patron details (name, email, phone)
 */
export const updateAdminUserController = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { name, surname, email, phone } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.fail('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (name && typeof name === 'string' && name.trim().length >= 2) {
      user.name = name.trim();
    }
    if (surname !== undefined) {
      user.surname = typeof surname === 'string' ? surname.trim() : '';
    }
    if (email !== undefined) {
      user.email = email ? email.trim() : null;
    }
    if (phone && typeof phone === 'string' && phone.trim().length >= 10) {
      let cleanPhone = phone.trim();
      if (!cleanPhone.startsWith('+')) {
        cleanPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`;
      }
      user.phone = cleanPhone;
    }

    await user.save();

    return res.ok({
      user: {
        id: user._id.toString(),
        name: user.name,
        surname: user.surname,
        phone: user.phone,
        email: user.email,
        role: user.role
      }
    }, 'Patron updated successfully.');
  } catch (error) {
    next(error);
  }
};
