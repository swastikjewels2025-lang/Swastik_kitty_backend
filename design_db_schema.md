# Database Schema Design Plan

This document outlines the detailed MongoDB schemas (using Mongoose models) for the Swastik Kitty App. The database must be deployed with Replica Sets enabled to allow for ACID multi-document transactions.

## 1. `User` Collection
Stores both customers and system admins.

```javascript
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true, index: true },
  role: { type: String, enum: ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'], default: 'CUSTOMER' },
  kyc: {
    documentType: { type: String, enum: ['AADHAR', 'PAN'] },
    documentUrl: { type: String }, // Cloudinary Link
    isVerified: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now }
});
```

## 2. `Scheme` Collection
The master record for a kitty scheme created by the Admin.

```javascript
const SchemeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  targetAmount: { type: Number, required: true }, // e.g., 60000
  durationMonths: { type: Number, required: true }, // e.g., 12
  maxCapacity: { type: Number, default: 100 },
  currentMembers: { type: Number, default: 0 },
  status: { type: String, enum: ['OPEN', 'ONGOING', 'COMPLETED'], default: 'OPEN' },
  startDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});
```

## 3. `Membership` Collection
Links a User to a Scheme. Crucial for calculating their dynamic EMI.

```javascript
const MembershipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  schemeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme', required: true, index: true },
  tokenNumber: { type: Number }, // The chit number (1-100)
  customMonthlyEmi: { type: Number, required: true }, // E.g. 5000 (or 6000 for late joiners)
  totalPaidAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['ACTIVE', 'WINNER', 'COMPLETED', 'DEFAULTED'], default: 'ACTIVE' },
  winMonth: { type: Number, default: null }, // If they win, which month they won
  joinedAtMonth: { type: Number, required: true }, // e.g., Month 1, 2, or 3
  createdAt: { type: Date, default: Date.now }
});
```

## 4. `Payment` Collection
The transactional ledger. This collection is strictly append-only (immutable).

```javascript
const PaymentSchema = new mongoose.Schema({
  membershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  monthFor: { type: Number, required: true }, // Which month is this payment for?
  paymentMethod: { type: String, enum: ['ONLINE', 'CASH'], required: true },
  transactionId: { type: String }, // GoKwik ID or Cash Receipt ID
  receiptUrl: { type: String }, // Cloudinary link to the PDF receipt
  status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
  paidAt: { type: Date, default: Date.now }
});
```
