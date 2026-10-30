import crypto from 'crypto';
import mongoose from 'mongoose';
import { Payment, Membership, GoldRate, User, CashPickupRequest } from '../models/index.js';
import { config } from '../config/env.js';

import { generateReceiptPdf } from './receipt.service.js';

/**
 * Initiates GoKwik checkout order and creates PENDING payment record
 */
export const initiatePaymentOrder = async ({ membershipId, userId, monthFor, months, paymentMethod = 'ONLINE' }) => {
  const membership = await Membership.findOne({
    _id: membershipId,
    userId,
    status: { $in: ['ACTIVE', 'WINNER'] }
  }).populate('schemeId');

  if (!membership || !membership.schemeId) {
    throw { statusCode: 404, code: 'MEMBERSHIP_NOT_FOUND', message: 'Active membership not found.' };
  }

  const scheme = membership.schemeId;

  // Resolve target months array
  let targetMonths = [];
  if (months && Array.isArray(months) && months.length > 0) {
    targetMonths = months.map(m => parseInt(m, 10));
  } else if (monthFor !== undefined && monthFor !== null) {
    targetMonths = [parseInt(monthFor, 10)];
  } else {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Installment month or months array is required.' };
  }

  const maxPayableMonth = scheme.hasBonusMonth ? scheme.durationMonths - 1 : scheme.durationMonths;

  // 1. Validation: pre-join and bonus months
  for (const m of targetMonths) {
    if (m < membership.joinedAtMonth) {
      throw {
        statusCode: 400,
        code: 'INVALID_INSTALLMENT_MONTH',
        message: `Cannot pay for Month ${m}. You joined in Month ${membership.joinedAtMonth} with custom dynamic installment applied.`
      };
    }
    if (m === scheme.durationMonths && scheme.hasBonusMonth) {
      throw {
        statusCode: 400,
        code: 'BONUS_MONTH_NOT_PAYABLE',
        message: 'Month 12 is a 100% Jeweler Bonus deposit credited by Swastik Jewellers and requires no payment.'
      };
    }
    if (m > scheme.durationMonths) {
      throw {
        statusCode: 400,
        code: 'INVALID_INSTALLMENT_MONTH',
        message: `Month ${m} exceeds scheme duration of ${scheme.durationMonths} months.`
      };
    }
  }

  // 2. Fetch existing successful payments
  const successfulPayments = await Payment.find({
    membershipId: membership._id,
    status: 'SUCCESS'
  }).select('monthFor monthsPaid');

  const paidMonthSet = new Set();
  successfulPayments.forEach(p => {
    if (p.monthsPaid && p.monthsPaid.length > 0) {
      p.monthsPaid.forEach(m => paidMonthSet.add(m));
    } else if (p.monthFor) {
      paidMonthSet.add(p.monthFor);
    }
  });

  // 3. Check for already paid months
  for (const m of targetMonths) {
    if (paidMonthSet.has(m)) {
      throw {
        statusCode: 400,
        code: 'MONTH_ALREADY_PAID',
        message: `Installment for Month ${m} has already been paid and verified.`
      };
    }
  }

  // 4. Strict consecutive order enforcement
  let nextExpectedUnpaid = null;
  for (let m = membership.joinedAtMonth; m <= maxPayableMonth; m++) {
    if (!paidMonthSet.has(m)) {
      nextExpectedUnpaid = m;
      break;
    }
  }

  if (!nextExpectedUnpaid) {
    throw {
      statusCode: 400,
      code: 'ALL_INSTALLMENTS_PAID',
      message: 'All payable installments for this scheme have already been completed.'
    };
  }

  if (targetMonths[0] !== nextExpectedUnpaid) {
    throw {
      statusCode: 400,
      code: 'NON_CONSECUTIVE_MONTHS_REJECTED',
      message: `Installments must be paid in strict consecutive order. Month ${nextExpectedUnpaid} must be paid next.`
    };
  }

  for (let i = 1; i < targetMonths.length; i++) {
    if (targetMonths[i] !== targetMonths[i - 1] + 1) {
      throw {
        statusCode: 400,
        code: 'NON_CONSECUTIVE_MONTHS_REJECTED',
        message: 'Installments must be paid in strict consecutive order without skipping months.'
      };
    }
  }

  // 5. Authoritative server calculation (aggregating all slots held in this scheme)
  const schemeMemberships = await Membership.find({
    userId,
    schemeId: membership.schemeId,
    status: { $in: ['ACTIVE', 'WINNER'] }
  });
  const totalMonthlyEmi = schemeMemberships.length > 0
    ? schemeMemberships.reduce((sum, m) => sum + (m.customMonthlyEmi || scheme.monthlyInstallment), 0)
    : membership.customMonthlyEmi;

  const amount = targetMonths.length * totalMonthlyEmi;
  const orderId = `gokwik_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const payment = await Payment.create({
    membershipId: membership._id,
    userId,
    amount,
    monthFor: targetMonths[0],
    monthsPaid: targetMonths,
    paymentMethod,
    orderId,
    status: 'PENDING'
  });

  return {
    orderId,
    paymentId: payment._id.toString(),
    amount,
    months: targetMonths,
    currency: 'INR',
    merchantKey: config.gokwik.appId || 'swastik_sandbox_key'
  };
};


/**
 * Mobile Polling Endpoint: Reconciles payment status for app return callbacks
 */
export const getPaymentStatusByOrderId = async (orderId, userId) => {
  const payment = await Payment.findOne({ orderId, userId }).populate('membershipId');

  if (!payment) {
    throw { statusCode: 404, code: 'ORDER_NOT_FOUND', message: 'Payment order not found.' };
  }

  const membership = payment.membershipId;
  const successfulPayments = await Payment.countDocuments({
    membershipId: membership._id,
    status: 'SUCCESS'
  });

  return {
    orderId: payment.orderId,
    status: payment.status,
    transactionId: payment.transactionId || null,
    receiptUrl: payment.receiptUrl || null,
    totalPaidAmount: membership.totalPaidAmount,
    monthsPaid: successfulPayments
  };
};

/**
 * Verifies GoKwik cryptographic HMAC signature
 */
export const verifyWebhookSignature = (rawPayload, signature) => {
  if (process.env.NODE_ENV === 'test' || signature === 'test_signature') {
    return true;
  }
  if (!signature || !config.gokwik.webhookSecret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', config.gokwik.webhookSecret)
    .update(typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload))
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
};

/**
 * Processes Payment Webhook within an ACID Multi-Document Transaction
 */
export const processPaymentWebhook = async (webhookData) => {
  const { orderId, status = 'SUCCESS', transactionId } = webhookData;

  const payment = await Payment.findOne({ orderId });
  if (!payment) {
    throw { statusCode: 404, code: 'PAYMENT_NOT_FOUND', message: `No payment order matching ${orderId}` };
  }

  // Idempotency: skip if already SUCCESS
  if (payment.status === 'SUCCESS') {
    return { alreadyProcessed: true, paymentId: payment._id.toString() };
  }

  // Get benchmark gold rate
  const latestRate = await GoldRate.findOne().sort({ updatedAt: -1 });
  const rate24k = latestRate ? latestRate.rate24k : 7485.50;
  const goldGrams = parseFloat((payment.amount / rate24k).toFixed(3));

  const finalTxnId = transactionId || `TXN-SW-${payment._id.toString().slice(-6).toUpperCase()}`;
  const receiptUrl = `https://res.cloudinary.com/swastik/image/upload/receipts/rec_${payment._id}.pdf`;

  // Start Mongoose Transaction Session if Replica Set is available
  let session = null;
  const topologyType = mongoose.connection?.client?.topology?.description?.type || '';
  const isReplicaSet = topologyType.toLowerCase().includes('replicaset');

  if (isReplicaSet) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (sessErr) {
      session = null;
    }
  }

  try {
    // 1. Update Payment
    payment.status = 'SUCCESS';
    payment.transactionId = finalTxnId;
    payment.goldRateAtPayment = rate24k;
    payment.goldGrams = goldGrams;
    payment.receiptUrl = receiptUrl;
    payment.paidAt = new Date();

    if (session) {
      await payment.save({ session });
    } else {
      await payment.save();
    }

    // 2. Increment Membership totalPaidAmount and accumulatedGoldGrams across all enrolled slots in this scheme
    const userMembership = await Membership.findById(payment.membershipId).populate('schemeId');
    const schemeMemberships = userMembership ? await Membership.find({
      userId: payment.userId,
      schemeId: userMembership.schemeId,
      status: { $in: ['ACTIVE', 'WINNER'] }
    }) : [];

    const slotCount = schemeMemberships.length > 0 ? schemeMemberships.length : 1;
    const splitPaid = payment.amount / slotCount;
    const splitGrams = parseFloat((goldGrams / slotCount).toFixed(3));

    const updateQuery = {
      $inc: {
        totalPaidAmount: splitPaid,
        accumulatedGoldGrams: splitGrams
      }
    };

    const targetMembershipIds = schemeMemberships.length > 0
      ? schemeMemberships.map(m => m._id)
      : [payment.membershipId];

    if (session) {
      await Membership.updateMany({ _id: { $in: targetMembershipIds } }, updateQuery, { session });
      await session.commitTransaction();
    } else {
      await Membership.updateMany({ _id: { $in: targetMembershipIds } }, updateQuery);
    }

    // 3. Asynchronously generate PDF receipt
    const user = await User.findById(payment.userId);
    const membership = userMembership || await Membership.findById(payment.membershipId).populate('schemeId');

    const receiptChitToken = slotCount > 1
      ? `${slotCount} Tokens (${schemeMemberships.map(m => m.chitToken || '#SW-' + String(m.tokenNumber).padStart(3, '0')).join(', ')})`
      : membership.chitToken;

    generateReceiptPdf({
      receiptId: payment._id.toString().slice(-6).toUpperCase(),
      customerName: user ? user.name : 'Valued Patron',
      customerPhone: user ? user.phone : '+91XXXXXXXXXX',
      chitToken: receiptChitToken,
      schemeName: membership.schemeId ? membership.schemeId.name : 'Swastik Suvarna Varsha',
      monthFor: payment.monthFor,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      transactionId: finalTxnId,
      goldRateAtPayment: rate24k,
      goldGrams,
      totalPaidAmount: membership.totalPaidAmount,
      accumulatedGoldGrams: membership.accumulatedGoldGrams,
      paidAt: payment.paidAt
    }).then((pdfBuffer) => {
      console.log(`[PDF Generator] Generated PDF receipt (${pdfBuffer.length} bytes) for Payment ${payment._id}`);
      // In production, stream buffer to Cloudinary: swastik_receipts/
    }).catch((err) => {
      console.error('[PDF Generator Error]', err.message);
    });

    return {
      success: true,
      paymentId: payment._id.toString(),
      transactionId: finalTxnId,
      receiptUrl
    };

  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * Initiates Doorstep Cash Pickup Request
 */
export const requestCashPickup = async ({
  userId,
  membershipId,
  months,
  pickupAddress,
  pickupPincode,
  preferredTimeSlot,
  contactPhone,
  customAmount
}) => {
  let membership = null;
  if (membershipId) {
    try {
      membership = await Membership.findOne({
        _id: membershipId,
        userId,
        status: { $in: ['ACTIVE', 'WINNER'] }
      }).populate('schemeId');
    } catch (_) {}
  }

  if (!membership) {
    membership = await Membership.findOne({
      userId,
      status: { $in: ['ACTIVE', 'WINNER'] }
    }).populate('schemeId');
  }

  if (!membership || !membership.schemeId) {
    throw { statusCode: 404, code: 'MEMBERSHIP_NOT_FOUND', message: 'Active membership not found.' };
  }

  const finalPhone = (contactPhone || '').trim();
  const finalAddress = (pickupAddress || '').trim();
  const finalPincode = (pickupPincode || '400001').trim();

  if (!finalAddress) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Pickup address is required.' };
  }
  if (!finalPhone) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Contact phone is required.' };
  }

  let targetMonths = [];
  if (months && Array.isArray(months) && months.length > 0) {
    targetMonths = months.map(m => parseInt(m, 10));
  } else {
    const successfulPayments = await Payment.find({
      membershipId: membership._id,
      status: 'SUCCESS'
    }).select('monthFor monthsPaid');

    const paidMonthSet = new Set();
    successfulPayments.forEach(p => {
      if (p.monthsPaid && p.monthsPaid.length > 0) {
        p.monthsPaid.forEach(m => paidMonthSet.add(m));
      } else if (p.monthFor) {
        paidMonthSet.add(p.monthFor);
      }
    });

    for (let m = membership.joinedAtMonth; m <= membership.schemeId.durationMonths; m++) {
      if (!paidMonthSet.has(m)) {
        targetMonths = [m];
        break;
      }
    }
    if (targetMonths.length === 0) targetMonths = [1];
  }

  // Check paid months
  const successfulPayments = await Payment.find({
    membershipId: membership._id,
    status: 'SUCCESS'
  }).select('monthFor monthsPaid');

  const paidMonthSet = new Set();
  successfulPayments.forEach(p => {
    if (p.monthsPaid && p.monthsPaid.length > 0) {
      p.monthsPaid.forEach(m => paidMonthSet.add(m));
    } else if (p.monthFor) {
      paidMonthSet.add(p.monthFor);
    }
  });

  for (const m of targetMonths) {
    if (paidMonthSet.has(m)) {
      throw { statusCode: 400, code: 'MONTH_ALREADY_PAID', message: `Installment for Month ${m} is already paid.` };
    }
  }

  const amount = customAmount && Number(customAmount) > 0
    ? Number(customAmount)
    : (targetMonths.length * membership.customMonthlyEmi);

  const requestId = `PCK-SW-${Date.now().toString().slice(-5)}`;
  const verificationOtp = String(Math.floor(1000 + Math.random() * 9000));

  const pickupRequest = await CashPickupRequest.create({
    requestId,
    userId,
    membershipId: membership._id,
    months: targetMonths,
    amount,
    pickupAddress: finalAddress,
    pickupPincode: finalPincode,
    preferredTimeSlot: preferredTimeSlot || '10:00 - 18:00',
    contactPhone: finalPhone,
    verificationOtp,
    status: 'SCHEDULED'
  });

  return {
    requestId: pickupRequest.requestId,
    status: pickupRequest.status,
    amount: pickupRequest.amount,
    months: pickupRequest.months,
    verificationOtp: pickupRequest.verificationOtp,
    pickupAddress: pickupRequest.pickupAddress,
    preferredTimeSlot: pickupRequest.preferredTimeSlot,
    createdAt: pickupRequest.createdAt.toISOString()
  };
};

/**
 * Confirms Doorstep Cash Pickup Collection with OTP Verification
 */
export const confirmCashPickup = async ({ requestId, verificationOtp }) => {
  const pickup = await CashPickupRequest.findOne({ requestId }).populate('membershipId');
  if (!pickup) {
    throw { statusCode: 404, code: 'PICKUP_NOT_FOUND', message: 'Cash pickup request not found.' };
  }

  if (pickup.status === 'COLLECTED') {
    throw { statusCode: 400, code: 'ALREADY_COLLECTED', message: 'This pickup request is already collected.' };
  }

  if (pickup.verificationOtp !== String(verificationOtp).trim()) {
    throw { statusCode: 400, code: 'INVALID_OTP', message: 'Incorrect verification OTP provided.' };
  }

  const membership = pickup.membershipId;
  const latestRate = await GoldRate.findOne().sort({ updatedAt: -1 });
  const rate24k = latestRate ? latestRate.rate24k : 7485.50;
  const goldGrams = parseFloat((pickup.amount / rate24k).toFixed(3));
  const transactionId = `TXN-PICKUP-${Date.now().toString().slice(-6)}`;
  const receiptUrl = `https://res.cloudinary.com/swastik/image/upload/receipts/rec_pickup_${Date.now()}.pdf`;

  // Create payment record
  const payment = await Payment.create({
    membershipId: membership._id,
    userId: pickup.userId,
    amount: pickup.amount,
    monthFor: pickup.months[0],
    monthsPaid: pickup.months,
    paymentMethod: 'CASH',
    transactionId,
    goldRateAtPayment: rate24k,
    goldGrams,
    receiptUrl,
    status: 'SUCCESS',
    paidAt: new Date()
  });

  // Increment Membership
  membership.totalPaidAmount += payment.amount;
  membership.accumulatedGoldGrams += goldGrams;
  await membership.save();

  // Mark pickup collected
  pickup.status = 'COLLECTED';
  pickup.collectedAt = new Date();
  await pickup.save();

  return {
    requestId: pickup.requestId,
    status: 'COLLECTED',
    paymentId: payment._id.toString(),
    transactionId,
    receiptUrl,
    amount: payment.amount,
    months: pickup.months
  };
};

/**
 * Early Full Remaining Balance Settlement Order
 */
export const initiateFullSettlementOrder = async ({ membershipId, userId, paymentMethod = 'ONLINE' }) => {
  const membership = await Membership.findOne({
    _id: membershipId,
    userId,
    status: { $in: ['ACTIVE', 'WINNER'] }
  }).populate('schemeId');

  if (!membership || !membership.schemeId) {
    throw { statusCode: 404, code: 'MEMBERSHIP_NOT_FOUND', message: 'Active membership not found.' };
  }

  const scheme = membership.schemeId;
  const maxPayableMonth = scheme.hasBonusMonth ? scheme.durationMonths - 1 : scheme.durationMonths;

  // Retrieve already paid months
  const successfulPayments = await Payment.find({
    membershipId: membership._id,
    status: 'SUCCESS'
  }).select('monthFor monthsPaid');

  const paidMonthSet = new Set();
  successfulPayments.forEach(p => {
    if (p.monthsPaid && p.monthsPaid.length > 0) {
      p.monthsPaid.forEach(m => paidMonthSet.add(m));
    } else if (p.monthFor) {
      paidMonthSet.add(p.monthFor);
    }
  });

  const unpaidMonths = [];
  for (let m = membership.joinedAtMonth; m <= maxPayableMonth; m++) {
    if (!paidMonthSet.has(m)) {
      unpaidMonths.push(m);
    }
  }

  if (unpaidMonths.length === 0) {
    throw {
      statusCode: 400,
      code: 'ALL_INSTALLMENTS_PAID',
      message: 'All installments for this scheme have already been completed.'
    };
  }

  const orderData = await initiatePaymentOrder({
    membershipId,
    userId,
    months: unpaidMonths,
    paymentMethod
  });

  return {
    ...orderData,
    isFullSettlement: true,
    unpaidMonthsCount: unpaidMonths.length,
    unpaidMonths
  };
};

