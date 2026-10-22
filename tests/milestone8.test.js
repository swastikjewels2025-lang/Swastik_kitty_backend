import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDb, closeTestDb, clearTestDb } from './testDb.js';
import { User, Scheme, Membership, Payment, CashPickupRequest, Booking } from '../src/models/index.js';

describe('💎 Milestone 8: Phase 2 Cash Pickup, Early Settlement & Bookings Tests', () => {

  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('8.1 Doorstep Cash Pickup: POST /api/v1/payments/cash-pickup-request creates scheduled request with 4-digit OTP', async () => {
    const user = await User.create({ name: 'Patron Pickup', phone: '+919876543210' });
    const loginRes = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919876543210', otp: '123456' });
    const token = loginRes.body.data.token;

    const scheme = await Scheme.create({
      name: 'Suvarna Varsha',
      targetAmount: 60000,
      monthlyInstallment: 5000,
      durationMonths: 12
    });

    const membership = await Membership.create({
      userId: user._id,
      schemeId: scheme._id,
      tokenNumber: 3,
      customMonthlyEmi: 5000,
      targetAmount: 60000,
      joinedAtMonth: 1
    });

    const res = await request(app)
      .post('/api/v1/payments/cash-pickup-request')
      .set('Authorization', `Bearer ${token}`)
      .send({
        membershipId: membership._id.toString(),
        months: [1],
        pickupAddress: 'Flat 402, Royal Palms, Bareilly',
        pickupPincode: '243001',
        preferredTimeSlot: '14:00 - 18:00',
        contactPhone: '+919876543210'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.requestId.startsWith('PCK-SW-'));
    assert.equal(res.body.data.status, 'SCHEDULED');
    assert.equal(res.body.data.amount, 5000);
    assert.equal(typeof res.body.data.verificationOtp, 'string');
    assert.equal(res.body.data.verificationOtp.length, 4);

    const record = await CashPickupRequest.findOne({ requestId: res.body.data.requestId });
    assert.ok(record);
    assert.equal(record.pickupAddress, 'Flat 402, Royal Palms, Bareilly');
  });

  it('8.2 Cash Pickup Validation: rejects if address or pincode is missing', async () => {
    const user = await User.create({ name: 'Patron Pickup', phone: '+919876543210' });
    const loginRes = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919876543210', otp: '123456' });
    const token = loginRes.body.data.token;

    const scheme = await Scheme.create({ name: 'Suvarna Varsha', targetAmount: 60000, monthlyInstallment: 5000, durationMonths: 12 });
    const membership = await Membership.create({
      userId: user._id,
      schemeId: scheme._id,
      tokenNumber: 1,
      customMonthlyEmi: 5000,
      targetAmount: 60000,
      joinedAtMonth: 1
    });

    const res = await request(app)
      .post('/api/v1/payments/cash-pickup-request')
      .set('Authorization', `Bearer ${token}`)
      .send({
        membershipId: membership._id.toString(),
        months: [1]
        // missing pickupAddress and pickupPincode
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('8.3 Cash Pickup Confirmation: admin confirms pickup with correct OTP and records cash payment', async () => {
    const admin = await User.create({ name: 'Admin Manager', phone: '+919999900000', role: 'ADMIN' });
    const adminLogin = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919999900000', otp: '123456' });
    const adminToken = adminLogin.body.data.token;

    const patron = await User.create({ name: 'Patron Cash', phone: '+919876543210' });
    const scheme = await Scheme.create({ name: 'Suvarna Varsha', targetAmount: 60000, monthlyInstallment: 5000, durationMonths: 12 });
    const membership = await Membership.create({
      userId: patron._id,
      schemeId: scheme._id,
      tokenNumber: 1,
      customMonthlyEmi: 5000,
      targetAmount: 60000,
      joinedAtMonth: 1,
      totalPaidAmount: 0
    });

    const pickup = await CashPickupRequest.create({
      requestId: 'PCK-SW-99881',
      userId: patron._id,
      membershipId: membership._id,
      months: [1],
      amount: 5000,
      pickupAddress: 'Bareilly',
      pickupPincode: '243001',
      contactPhone: '+919876543210',
      verificationOtp: '8492',
      status: 'SCHEDULED'
    });

    const res = await request(app)
      .post('/api/v1/admin/payments/confirm-cash-pickup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        requestId: 'PCK-SW-99881',
        verificationOtp: '8492'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'COLLECTED');

    const updatedPickup = await CashPickupRequest.findOne({ requestId: 'PCK-SW-99881' });
    assert.equal(updatedPickup.status, 'COLLECTED');

    const updatedMembership = await Membership.findById(membership._id);
    assert.equal(updatedMembership.totalPaidAmount, 5000);
  });

  it('8.4 Cash Pickup Invalid OTP: rejects confirmation if incorrect OTP is passed', async () => {
    const admin = await User.create({ name: 'Admin Manager', phone: '+919999900000', role: 'ADMIN' });
    const adminLogin = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919999900000', otp: '123456' });
    const adminToken = adminLogin.body.data.token;

    const patron = await User.create({ name: 'Patron Cash', phone: '+919876543210' });
    const scheme = await Scheme.create({ name: 'Suvarna Varsha', targetAmount: 60000, monthlyInstallment: 5000, durationMonths: 12 });
    const membership = await Membership.create({
      userId: patron._id,
      schemeId: scheme._id,
      tokenNumber: 1,
      customMonthlyEmi: 5000,
      targetAmount: 60000,
      joinedAtMonth: 1
    });

    await CashPickupRequest.create({
      requestId: 'PCK-SW-99882',
      userId: patron._id,
      membershipId: membership._id,
      months: [1],
      amount: 5000,
      pickupAddress: 'Bareilly',
      pickupPincode: '243001',
      contactPhone: '+919876543210',
      verificationOtp: '8492',
      status: 'SCHEDULED'
    });

    const res = await request(app)
      .post('/api/v1/admin/payments/confirm-cash-pickup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        requestId: 'PCK-SW-99882',
        verificationOtp: '0000' // wrong OTP
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_OTP');
  });

  it('8.5 Early Full Settlement: POST /api/v1/payments/settle-full calculates remaining payable months and creates order', async () => {
    const user = await User.create({ name: 'Patron Settlement', phone: '+919876543210' });
    const loginRes = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919876543210', otp: '123456' });
    const token = loginRes.body.data.token;

    const scheme = await Scheme.create({
      name: 'Suvarna Varsha 11+1',
      targetAmount: 60000,
      monthlyInstallment: 5000,
      durationMonths: 12,
      hasBonusMonth: true
    });

    const membership = await Membership.create({
      userId: user._id,
      schemeId: scheme._id,
      tokenNumber: 1,
      customMonthlyEmi: 5000,
      targetAmount: 60000,
      joinedAtMonth: 1,
      totalPaidAmount: 5000
    });

    // Month 1 already paid
    await Payment.create({
      membershipId: membership._id,
      userId: user._id,
      amount: 5000,
      monthFor: 1,
      monthsPaid: [1],
      status: 'SUCCESS',
      paymentMethod: 'ONLINE'
    });

    // Remaining customer payable months: Month 2 to 11 (10 months, 10 * 5000 = 50,000)
    const res = await request(app)
      .post('/api/v1/payments/settle-full')
      .set('Authorization', `Bearer ${token}`)
      .send({
        membershipId: membership._id.toString()
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isFullSettlement, true);
    assert.equal(res.body.data.amount, 50000); // 10 remaining months * 5000
    assert.equal(res.body.data.unpaidMonthsCount, 10);
    assert.deepEqual(res.body.data.unpaidMonths, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('8.6 Bullion Booking: POST /api/v1/bookings creates booking for coins with calculated totalAmount', async () => {
    const user = await User.create({ name: 'Patron Coins', phone: '+919876543210' });
    const loginRes = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919876543210', otp: '123456' });
    const token = loginRes.body.data.token;

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category: 'COINS',
        itemName: '4g 24K Gold Coin (999)',
        karat: '24K',
        weightGrams: 4.0,
        unitPrice: 29940,
        quantity: 2,
        notes: 'Delivery requested'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.bookingId.startsWith('BKG-SW-'));
    assert.equal(res.body.data.totalAmount, 59880); // 2 * 29940
    assert.equal(res.body.data.status, 'CONFIRMED');
    assert.equal(res.body.data.quantity, 2);
  });

  it('8.7 Booking History: GET /api/v1/bookings returns patron booking history', async () => {
    const user = await User.create({ name: 'Patron History', phone: '+919876543210' });
    const loginRes = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919876543210', otp: '123456' });
    const token = loginRes.body.data.token;

    await Booking.create({
      bookingId: 'BKG-SW-10001',
      userId: user._id,
      category: 'COINS',
      itemName: '2g Gold Coin',
      weightGrams: 2.0,
      unitPrice: 14970,
      quantity: 1,
      totalAmount: 14970
    });

    const res = await request(app)
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.totalBookings, 1);
    assert.equal(res.body.data.bookings[0].bookingId, 'BKG-SW-10001');
  });

  it('8.8 Admin Booking Status: PATCH /api/v1/bookings/:id/status updates status to DISPATCHED', async () => {
    const admin = await User.create({ name: 'Admin Manager', phone: '+919999900000', role: 'ADMIN' });
    const adminLogin = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919999900000', otp: '123456' });
    const adminToken = adminLogin.body.data.token;

    const user = await User.create({ name: 'Patron Test', phone: '+919876543210' });
    const booking = await Booking.create({
      bookingId: 'BKG-SW-10002',
      userId: user._id,
      category: 'COINS',
      itemName: '5g Gold Coin',
      weightGrams: 5.0,
      unitPrice: 37425,
      quantity: 1,
      totalAmount: 37425
    });

    const res = await request(app)
      .patch(`/api/v1/bookings/${booking._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DISPATCHED' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'DISPATCHED');

    const updated = await Booking.findById(booking._id);
    assert.equal(updated.status, 'DISPATCHED');
  });

});
