import { 
  initiatePaymentOrder, 
  getPaymentStatusByOrderId, 
  processPaymentWebhook, 
  verifyWebhookSignature 
} from '../services/payment.service.js';

export const initiatePaymentController = async (req, res, next) => {
  try {
    const { membershipId, monthFor, paymentMethod } = req.body;

    if (!membershipId || !monthFor) {
      return res.fail('Membership ID and installment month are required.', 400, 'VALIDATION_ERROR');
    }

    const orderData = await initiatePaymentOrder({
      membershipId,
      userId: req.user._id,
      monthFor,
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
