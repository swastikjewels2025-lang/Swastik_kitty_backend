import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  bookingId: {
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
  category: {
    type: String,
    enum: ['COINS', 'JEWELLERY', 'BULLION'],
    default: 'COINS'
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  karat: {
    type: String,
    enum: ['24K', '22K', '18K', 'SILVER_999'],
    default: '24K'
  },
  weightGrams: {
    type: Number,
    required: true,
    min: 0.1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 1
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 1
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['CONFIRMED', 'DISPATCHED', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED'],
    default: 'CONFIRMED',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Booking = mongoose.model('Booking', BookingSchema);
