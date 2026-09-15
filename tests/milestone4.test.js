import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDb, closeTestDb, clearTestDb } from './testDb.js';
import { User, Scheme, Payment, GoldRate } from '../src/models/index.js';

describe('💎 Milestone 4: Schemes, Late-Joiner Dynamic EMI & Passbook Dashboard Tests', () => {

  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('4.1 Scheme Discovery: GET /api/v1/schemes/active should return list of open schemes', async () => {
    await Scheme.create({
      name: 'Swastik Suvarna Varsha',
      targetAmount: 60000,
      durationMonths: 12,
      monthlyInstallment: 5000,
      maxCapacity: 100,
      currentMembers: 15,
      status: 'OPEN',
      benefits: ['1 Month Free Jeweler Bonus', '25% Making Charge Discount']
    });

    const res = await request(app).get('/api/v1/schemes/active');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.schemes.length, 1);
    assert.equal(res.body.data.schemes[0].name, 'Swastik Suvarna Varsha');
    assert.equal(res.body.data.schemes[0].targetAmount, 60000);
    assert.equal(res.body.data.schemes[0].monthlyInstallment, 5000);
  });

  it('4.2 Admin Scheme Creation: POST /api/v1/schemes should create scheme for admin, reject customer', async () => {
    // 1. Create admin user
    const adminUser = await User.create({
      name: 'Store Manager',
      phone: '+919999900000',
      role: 'ADMIN'
    });

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919999900000', otp: '123456' });

    const adminToken = adminLoginRes.body.data.token;

    // 2. Create customer user
    const customerLoginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp: '123456' });

    const customerToken = customerLoginRes.body.data.token;

    // 3. Customer attempt should return 403 Forbidden
    const customerAttempt = await request(app)
      .post('/api/v1/schemes')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Unauthorized Scheme', targetAmount: 50000 });

    assert.equal(customerAttempt.status, 403);
    assert.equal(customerAttempt.body.error.code, 'FORBIDDEN');

    // 4. Admin attempt should succeed with 201 Created
    const adminCreate = await request(app)
      .post('/api/v1/schemes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Royal Bridal Kitty',
        targetAmount: 360000,
        durationMonths: 12,
        monthlyInstallment: 30000,
        maxCapacity: 50
      });

    assert.equal(adminCreate.status, 201);
    assert.equal(adminCreate.body.success, true);
    assert.equal(adminCreate.body.data.name, 'Royal Bridal Kitty');
  });

  it('4.3 Standard Enrollment: POST /api/v1/memberships/join in Month 1 assigns token #SW-001 and EMI ₹5,000', async () => {
    const scheme = await Scheme.create({
      name: 'Swastik Suvarna Varsha',
      targetAmount: 60000,
      durationMonths: 12,
      monthlyInstallment: 5000,
      hasBonusMonth: true,
      bonusAmount: 5000
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp: '123456' });

    const token = loginRes.body.data.token;
    await User.updateOne({ phone: '+919876543210' }, { 'kyc.isVerified': true, 'kyc.status': 'VERIFIED' });

    const joinRes = await request(app)
      .post('/api/v1/memberships/join')
      .set('Authorization', `Bearer ${token}`)
      .send({
        schemeId: scheme._id.toString(),
        joinedAtMonth: 1
      });

    assert.equal(joinRes.status, 201);
    assert.equal(joinRes.body.success, true);
    assert.equal(joinRes.body.data.membership.chitToken, '#SW-001');
    assert.equal(joinRes.body.data.membership.customMonthlyEmi, 5000);
    assert.equal(joinRes.body.data.membership.joinedAtMonth, 1);

    // Duplicate join should be rejected with 409 Conflict
    const dupJoinRes = await request(app)
      .post('/api/v1/memberships/join')
      .set('Authorization', `Bearer ${token}`)
      .send({ schemeId: scheme._id.toString() });

    assert.equal(dupJoinRes.status, 409);
    assert.equal(dupJoinRes.body.error.code, 'DUPLICATE_MEMBERSHIP');
  });

  it('4.4 Late-Joiner Math: joining in Month 3 recalculates EMI to ₹6,111 for 9 remaining payable months', async () => {
    const scheme = await Scheme.create({
      name: 'Swastik Suvarna Varsha',
      targetAmount: 60000,
      durationMonths: 12,
      monthlyInstallment: 5000,
      hasBonusMonth: true,
      bonusAmount: 5000
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919111122222', otp: '123456' });

    const token = loginRes.body.data.token;
    await User.updateOne({ phone: '+919111122222' }, { 'kyc.isVerified': true, 'kyc.status': 'VERIFIED' });

    // Join in Month 3: (60,000 - 5,000 bonus = 55,000 net payable). Months 3..11 = 9 months.
    // 55,000 / 9 = 6,111.11 -> Math.round = 6111
    const joinRes = await request(app)
      .post('/api/v1/memberships/join')
      .set('Authorization', `Bearer ${token}`)
      .send({
        schemeId: scheme._id.toString(),
        joinedAtMonth: 3
      });

    assert.equal(joinRes.status, 201);
    assert.equal(joinRes.body.data.membership.customMonthlyEmi, 6111);
    assert.equal(joinRes.body.data.membership.joinedAtMonth, 3);
  });

  it('4.5 Dashboard Aggregator: GET /api/v1/memberships/my-dashboard synthesizes full 12-month passbook', async () => {
    // 1. Create gold rate benchmark
    await GoldRate.create({
      rate24k: 7485.50,
      rate22k: 6860.00,
      rateChangePct: 0.62
    });

    // 2. Create Scheme
    const scheme = await Scheme.create({
      name: 'Swastik Suvarna Varsha',
      targetAmount: 60000,
      durationMonths: 12,
      monthlyInstallment: 5000,
      hasBonusMonth: true,
      bonusAmount: 5000
    });

    // 3. User login & join in Month 3
    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919333344444', otp: '123456' });

    const token = loginRes.body.data.token;
    const userId = loginRes.body.data.user.id;
    await User.updateOne({ phone: '+919333344444' }, { 'kyc.isVerified': true, 'kyc.status': 'VERIFIED' });

    const joinRes = await request(app)
      .post('/api/v1/memberships/join')
      .set('Authorization', `Bearer ${token}`)
      .send({
        schemeId: scheme._id.toString(),
        joinedAtMonth: 3
      });

    const membershipId = joinRes.body.data.membership.id;

    // 4. Simulate a payment for Month 3
    await Payment.create({
      membershipId,
      userId,
      amount: 6111,
      monthFor: 3,
      paymentMethod: 'ONLINE',
      transactionId: 'TXN-SW-10821',
      goldGrams: 0.816,
      goldRateAtPayment: 7485.50,
      status: 'SUCCESS',
      paidAt: new Date()
    });

    // 5. Fetch Dashboard
    const dashboardRes = await request(app)
      .get('/api/v1/memberships/my-dashboard')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(dashboardRes.status, 200);
    assert.equal(dashboardRes.body.success, true);
    const d = dashboardRes.body.data.dashboard;
    assert.ok(d);
    assert.equal(d.chitToken, '#SW-001');
    assert.equal(d.targetAmount, 60000);
    assert.equal(d.totalPaidAmount, 6111);
    assert.equal(d.monthsPaid, 1);
    assert.equal(d.accumulatedGoldGrams, 0.816);
    assert.ok(d.currentValuation > 0);

    // Verify Passbook structure
    assert.equal(d.passbook.length, 12);
    // Month 1 & Month 2: PRE_JOIN
    assert.equal(d.passbook[0].status, 'PRE_JOIN');
    assert.equal(d.passbook[1].status, 'PRE_JOIN');
    // Month 3: PAID
    assert.equal(d.passbook[2].status, 'PAID');
    assert.equal(d.passbook[2].transactionId, 'TXN-SW-10821');
    assert.equal(d.passbook[2].goldGrams, 0.816);
    // Month 4: CURRENT
    assert.equal(d.passbook[3].status, 'CURRENT');
    assert.equal(d.passbook[3].amount, 6111);
    // Month 12: BONUS
    assert.equal(d.passbook[11].status, 'BONUS');
    assert.equal(d.passbook[11].amount, 5000);
  });

});
