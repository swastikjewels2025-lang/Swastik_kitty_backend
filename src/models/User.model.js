import mongoose from 'mongoose';

const KycSubSchema = new mongoose.Schema({
  documentType: {
    type: String,
    enum: ['AADHAAR', 'PAN', null],
    default: null
  },
  documentNumber: {
    type: String,
    default: null
  },
  documentNumberMasked: {
    type: String,
    default: null
  },
  documentUrl: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED'],
    default: 'NOT_SUBMITTED'
  },
  referenceId: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  submittedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Mobile phone number is required'],
    unique: true,
    trim: true,
    index: true
  },
  role: {
    type: String,
    enum: ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'],
    default: 'CUSTOMER'
  },
  tier: {
    type: String,
    default: 'Standard Member'
  },
  kyc: {
    type: KycSubSchema,
    default: () => ({})
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const User = mongoose.model('User', UserSchema);
