import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  membershipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membership',
    required: [true, 'Membership reference is required'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [1, 'Amount must be at least ₹1']
  },
  monthFor: {
    type: Number,
    required: [true, 'Target installment month is required'],
    min: [1, 'Month must be between 1 and 12'],
    max: [12, 'Month cannot exceed 12']
  },
  paymentMethod: {
    type: String,
    enum: ['ONLINE', 'CASH'],
    required: [true, 'Payment method is required']
  },
  orderId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  transactionId: {
    type: String,
    index: true,
    default: null
  },
  receiptUrl: {
    type: String,
    default: null
  },
  goldRateAtPayment: {
    type: Number,
    default: null
  },
  goldGrams: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'PENDING',
    index: true
  },
  paidAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Payment = mongoose.model('Payment', PaymentSchema);
