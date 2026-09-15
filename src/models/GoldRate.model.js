import mongoose from 'mongoose';

const GoldRateSchema = new mongoose.Schema({
  rate24k: {
    type: Number,
    required: [true, '24K gold rate per gram is required']
  },
  rate22k: {
    type: Number,
    required: [true, '22K gold rate per gram is required']
  },
  rateChangePct: {
    type: Number,
    default: 0.0
  },
  benchmark: {
    type: String,
    default: 'IBJA Official'
  },
  unit: {
    type: String,
    default: '1 gram'
  },
  currency: {
    type: String,
    default: 'INR'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export const GoldRate = mongoose.model('GoldRate', GoldRateSchema);
