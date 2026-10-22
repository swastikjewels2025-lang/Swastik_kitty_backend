import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true
  },
  body: {
    type: String,
    required: [true, 'Notification body is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['EMI_DUE', 'PAYMENT_SUCCESS', 'WINNER_ALERT', 'GENERAL', 'OFFER'],
    default: 'GENERAL'
  },
  actionRoute: {
    type: String,
    default: null
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Notification = mongoose.model('Notification', NotificationSchema);
