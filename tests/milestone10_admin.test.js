import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User, Scheme, Membership, Payment, GoldRate, CashPickupRequest, Booking, Notification } from '../src/models/index.js';
import { issueJwtToken } from '../src/services/auth.service.js';

describe('💎 Milestone 10: Admin Phase A Management & Analytics Suite', () => {
  let mongoServer;
  let adminToken;
  let customerToken;
  let adminUser;
  let customerUser;
  let sampleScheme;
  let sampleMembership;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(uri); 
    await Membership.init();

    // Seed master admin
    adminUser = await User.create({
      name: 'Swastik Admin',
      phone: '+919999999999',
      role: 'ADMIN'
    });
    adminToken = issueJwtToken(adminUser);

    // Seed sample customer with PENDING kyc
    customerUser = await User.create({
      name: 'Aditi Verma',
      surname: 'Verma',
      phone: '+919876543210',
      email: 'aditi@example.com',
      role: 'CUSTOMER',
      kyc: {
        documentType: 'AADHAAR',
        documentNumber: '441591595195',
        documentNumberMasked: 'XXXX-XXXX-5195',
        documentUrl: 'https://res.cloudinary.com/swastik/image/upload/v1/kyc/sample.jpg',
        status: 'PENDING',
        submittedAt: new Date()
      }
    });
    customerToken = issueJwtToken(customerUser);

    // Seed sample scheme
    sampleScheme = await Scheme.create({
      name: 'Swastik Suvarna Varsha 5K',
      targetAmount: 60000,
      monthlyInstallment: 5000,
      durationMonths: 12,
      totalSlots: 50,
      maxCapacity: 50,
      status: 'OPEN'
    });

    // Seed sample membership
    sampleMembership = await Membership.create({
      userId: customerUser._id,
      schemeId: sampleScheme._id,
      tokenNumber: 7,
      customMonthlyEmi: 5000,
      targetAmount: 60000,
      joinedAtMonth: 1,
      status: 'ACTIVE'
    });

    // Seed gold rate
    await GoldRate.create({
      rate24k: 7850,
      rate22k: 7195,
      rateChangePct: 0.45
    });

    // Seed payment
    await Payment.create({
      membershipId: sampleMembership._id,
      userId: customerUser._id,
      amount: 5000,
      monthFor: 1,
      paymentMethod: 'ONLINE',
      transactionId: 'TXN-INIT-001',
      goldRateAtPayment: 7850,
      goldGrams: 0.637,
      status: 'SUCCESS',
      paidAt: new Date()
    });

    // Seed cash pickup request
    await CashPickupRequest.create({
      requestId: 'PICKUP-1001',
      userId: customerUser._id,
      membershipId: sampleMembership._id,
      months: [2],
      amount: 5000,
      pickupAddress: 'Sector 62, Noida, UP',
      pickupPincode: '201309',
      contactPhone: customerUser.phone,
      verificationOtp: '7412',
      status: 'SCHEDULED'
    });

    // Seed bullion booking
    await Booking.create({
      bookingId: 'BKG-GOLD-001',
      userId: customerUser._id,
      category: 'COINS',
      itemName: 'Swastik Lakshmi 24K Gold Coin (5g)',
      karat: '24K',
      weightGrams: 5,
      unitPrice: 39250,
      quantity: 1,
      totalAmount: 39250,
      status: 'CONFIRMED'
    });
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('10.1 Role Guard: should reject non-admin patrons with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/stats')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it('10.2 Dashboard Stats: should return full operational metrics for admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.metrics.totalPatrons, 1);
    assert.equal(res.body.data.metrics.activeMemberships, 1);
    assert.equal(res.body.data.metrics.totalRevenue, 5000);
    assert.equal(res.body.data.metrics.pendingKyc, 1);
    assert.equal(res.body.data.metrics.pendingPickups, 1);
    assert.ok(res.body.data.recent.payments.length >= 1);
    assert.ok(res.body.data.recent.pendingKyc.length >= 1);
  });

  it('10.3 Users Management: should list patrons with search and membershipCount', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?search=Aditi')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.users.length, 1);
    assert.equal(res.body.data.users[0].name, 'Aditi Verma');
    assert.equal(res.body.data.users[0].membershipCount, 1);
  });

  it('10.4 User Detail: should return 360-degree history of user', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/users/${customerUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.name, 'Aditi Verma');
    assert.equal(res.body.data.memberships.length, 1);
    assert.equal(res.body.data.payments.length, 1);
    assert.equal(res.body.data.pickups.length, 1);
    assert.equal(res.body.data.bookings.length, 1);
  });

  it('10.5 KYC Pending Queue: should return pending verifications', async () => {
    const res = await request(app)
      .get('/api/v1/admin/kyc/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.users.length, 1);
    assert.equal(res.body.data.users[0].kyc.status, 'PENDING');
  });

  it('10.6 Payments Ledger: should list payments with populated user and scheme', async () => {
    const res = await request(app)
      .get('/api/v1/admin/payments?status=SUCCESS')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.payments.length, 1);
    assert.equal(res.body.data.payments[0].amount, 5000);
  });

  it('10.7 Cash Pickups: should return scheduled cash pickup requests', async () => {
    const res = await request(app)
      .get('/api/v1/admin/pickups?status=SCHEDULED')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.pickups.length, 1);
    assert.equal(res.body.data.pickups[0].requestId, 'PICKUP-1001');
  });

  it('10.8 Schemes Catalog & Update: should list schemes with enrolled count and allow update', async () => {
    const res = await request(app)
      .get('/api/v1/admin/schemes')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].enrolledCount, 1);

    // Update scheme
    const updateRes = await request(app)
      .patch(`/api/v1/admin/schemes/${sampleScheme._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ benefits: ['Special Akshay Tritiya Coin', 'Guaranteed Bonus Month'] });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.benefits.length, 2);
  });

  it('10.9 Memberships: should list active memberships with chitToken', async () => {
    const res = await request(app)
      .get('/api/v1/admin/memberships?status=ACTIVE')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.memberships.length, 1);
    assert.equal(res.body.data.memberships[0].tokenNumber, 7);
  });

  it('10.10 Bullion Bookings: should list bookings and allow status update to DISPATCHED', async () => {
    const listRes = await request(app)
      .get('/api/v1/admin/bookings')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(listRes.status, 200);
    const booking = listRes.body.data.bookings[0];

    const patchRes = await request(app)
      .patch(`/api/v1/admin/bookings/${booking._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DISPATCHED', notes: 'Dispatched via BlueDart AWB #98127391' });

    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.data.status, 'DISPATCHED');
  });

  it('10.11 Lucky Draw Eligibility: should return eligible participants for scheme', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/draw/eligible/${sampleScheme._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.totalEligible, 1);
    assert.equal(res.body.data.members[0].tokenNumber, 7);
  });

  it('10.12 Broadcast Notification: should create broadcast notifications for all patrons', async () => {
    const res = await request(app)
      .post('/api/v1/admin/notifications/broadcast')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Akshay Tritiya Special Offer! 🌟',
        body: 'Pre-book your 24K Gold Coin today with 0% making charges.',
        type: 'OFFER'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.sentCount, 1);

    // Verify notification reached customer
    const note = await Notification.findOne({ userId: customerUser._id, type: 'OFFER' });
    assert.ok(note);
    assert.equal(note.title, 'Akshay Tritiya Special Offer! 🌟');
  });
});
