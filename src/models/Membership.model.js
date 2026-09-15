import mongoose from 'mongoose';

const MembershipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  schemeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scheme',
    required: [true, 'Scheme reference is required'],
    index: true
  },
  tokenNumber: {
    type: Number,
    required: [true, 'Chit token number is required']
  },
  customMonthlyEmi: {
    type: Number,
    required: [true, 'Custom monthly EMI is required']
  },
  targetAmount: {
    type: Number,
    required: [true, 'Target amount is required']
  },
  totalPaidAmount: {
    type: Number,
    default: 0
  },
  accumulatedGoldGrams: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'WINNER', 'COMPLETED', 'DEFAULTED'],
    default: 'ACTIVE',
    index: true
  },
  winMonth: {
    type: Number,
    default: null
  },
  joinedAtMonth: {
    type: Number,
    required: [true, 'Enrollment month index is required'],
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Formatted Chit Token (e.g. #SW-042)
MembershipSchema.virtual('chitToken').get(function () {
  if (!this.tokenNumber) return null;
  return `#SW-${String(this.tokenNumber).padStart(3, '0')}`;
});

// Compound unique indexes
MembershipSchema.index({ schemeId: 1, tokenNumber: 1 }, { unique: true });
MembershipSchema.index({ userId: 1, schemeId: 1 }, { unique: true });

export const Membership = mongoose.model('Membership', MembershipSchema);
