import { Membership, Payment, GoldRate, User } from '../models/index.js';
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
