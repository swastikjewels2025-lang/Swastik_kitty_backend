import mongoose from 'mongoose';

const CashPickupRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  membershipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membership',
    required: true,
    index: true
  },
  months: {
    type: [Number],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  pickupAddress: {
    type: String,
    required: [true, 'Pickup address is required'],
    trim: true
  },
  pickupPincode: {
    type: String,
    required: [true, 'Pincode is required'],
    trim: true
  },
  preferredTimeSlot: {
    type: String,
    default: '10:00 - 18:00'
  },
  contactPhone: {
    type: String,
    required: true,
    trim: true
  },
  verificationOtp: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['SCHEDULED', 'COLLECTED', 'CANCELLED'],
    default: 'SCHEDULED',
    index: true
  },
  collectedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const CashPickupRequest = mongoose.model('CashPickupRequest', CashPickupRequestSchema);
