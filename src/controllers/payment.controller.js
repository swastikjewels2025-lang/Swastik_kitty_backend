import { 
  initiatePaymentOrder, 
  getPaymentStatusByOrderId, 
  processPaymentWebhook, 
  verifyWebhookSignature,
  requestCashPickup,
  initiateFullSettlementOrder
} from '../services/payment.service.js';

export const initiatePaymentController = async (req, res, next) => {
  try {
    const { membershipId, monthFor, months, monthsCount, paymentMethod } = req.body;

    if (!membershipId || (!monthFor && (!months || months.length === 0))) {
      return res.fail('Membership ID and installment month(s) are required.', 400, 'VALIDATION_ERROR');
    }

    const orderData = await initiatePaymentOrder({
      membershipId,
      userId: req.user._id,
      monthFor,
      months,
      monthsCount,
      paymentMethod: paymentMethod || 'ONLINE'
    });

    return res.ok(orderData, 'Payment order initiated.');
  } catch (error) {
    if (error.statusCode) {
      return res.fail(error.message, error.statusCode, error.code);
    }
    next(error);
  }
};

export const requestCashPickupController = async (req, res, next) => {
  try {
    const { membershipId, months, monthFor, pickupAddress, pickupPincode, preferredTimeSlot, contactPhone, amount } = req.body;

    const targetMonths = months || (monthFor ? [monthFor] : []);
    const pickupData = await requestCashPickup({
      userId: req.user._id,
      membershipId,
      months: targetMonths,
      pickupAddress: pickupAddress || req.body.address,
      pickupPincode: pickupPincode || req.body.pincode,
      preferredTimeSlot: preferredTimeSlot || req.body.timeSlot,
      contactPhone: contactPhone || req.body.phone || req.user.phone,
      customAmount: amount
    });

    return res.created(pickupData, 'Doorstep cash pickup requested. An executive will arrive with verification OTP.');
  } catch (error) {
    if (error.statusCode) {
      return res.fail(error.message, error.statusCode, error.code);
    }
    next(error);
  }
};

export const settleFullController = async (req, res, next) => {
  try {
    const { membershipId, paymentMethod } = req.body;

    if (!membershipId) {
      return res.fail('Membership ID is required.', 400, 'VALIDATION_ERROR');
    }

    const orderData = await initiateFullSettlementOrder({
      membershipId,
      userId: req.user._id,
      paymentMethod: paymentMethod || 'ONLINE'
    });

    return res.ok(orderData, 'Full settlement order initiated.');
  } catch (error) {
    if (error.statusCode) {
      return res.fail(error.message, error.statusCode, error.code);
    }
    next(error);
  }
};

export const getPaymentStatusController = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.fail('Order ID is required.', 400, 'VALIDATION_ERROR');
    }

    const statusData = await getPaymentStatusByOrderId(orderId, req.user._id);
    return res.ok(statusData, 'Payment status checked.');
  } catch (error) {
    if (error.statusCode) {
      return res.fail(error.message, error.statusCode, error.code);
    }
    next(error);
  }
};

export const paymentWebhookController = async (req, res, next) => {
  try {
    const signature = req.headers['x-gokwik-signature'];
    const payload = req.body;

    // Verify cryptographic signature
    const isValid = verifyWebhookSignature(payload, signature);
    if (!isValid) {
      return res.fail('Invalid webhook signature.', 401, 'INVALID_SIGNATURE');
    }

    const result = await processPaymentWebhook(payload);
    return res.ok(result, 'Webhook processed successfully.');
  } catch (error) {
    if (error.statusCode) {
      return res.fail(error.message, error.statusCode, error.code);
    }
    next(error);
  }
};

