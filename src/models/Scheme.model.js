import mongoose from 'mongoose';

const SchemeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Scheme name is required'],
    trim: true
  },
  targetAmount: {
    type: Number,
    required: [true, 'Target amount is required'],
    min: [1000, 'Target amount must be at least ₹1,000']
  },
  durationMonths: {
    type: Number,
    required: [true, 'Duration in months is required'],
    default: 12,
    min: [1, 'Duration must be at least 1 month']
  },
  monthlyInstallment: {
    type: Number,
    required: [true, 'Base monthly installment is required']
  },
  maxCapacity: {
    type: Number,
    default: 100,
    min: [1, 'Capacity must be at least 1']
  },
  currentMembers: {
    type: Number,
    default: 0,
    min: [0, 'Member count cannot be negative']
  },
  status: {
    type: String,
    enum: ['OPEN', 'ONGOING', 'COMPLETED'],
    default: 'OPEN',
    index: true
  },
  benefits: [{
    type: String
  }],
  bannerImageUrl: {
    type: String,
    default: null
  },
  hasBonusMonth: {
    type: Boolean,
    default: true
  },
  bonusAmount: {
    type: Number,
    default: 5000
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual property for whether scheme is full
SchemeSchema.virtual('isFull').get(function () {
  return this.currentMembers >= this.maxCapacity;
});

export const Scheme = mongoose.model('Scheme', SchemeSchema);
