import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDb, closeTestDb, clearTestDb } from './testDb.js';
import { User, Scheme, Membership, Payment, GoldRate } from '../src/models/index.js';

describe('💎 Milestone 6: Admin Controls, Live Gold Rates & Full E2E Sign-Off Tests', () => {

  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('6.1 Live Gold Rates: GET /api/v1/rates/gold should return benchmark rates', async () => {
    await GoldRate.create({
      rate24k: 7485.50,
      rate22k: 6860.00,
      rateChangePct: 0.62,
      benchmark: 'IBJA Official'
    });

    const res = await request(app).get('/api/v1/rates/gold');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.rate24k, 7485.50);
    assert.equal(res.body.data.rate22k, 6860.00);
    assert.equal(res.body.data.currency, 'INR');
    assert.equal(res.body.data.benchmark, 'IBJA Official');
  });

  it('6.2 Admin Gold Rate Update: POST /api/v1/admin/rates/gold should update rates, reject customer', async () => {
    // 1. Admin login
    await User.create({ name: 'Admin', phone: '+919999900000', role: 'ADMIN' });
    const adminLogin = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919999900000', otp: '123456' });

    const adminToken = adminLogin.body.data.token;

    // 2. Customer login
    const custLogin = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp: '123456' });

    const custToken = custLogin.body.data.token;

    // 3. Customer blocked with 403
    const custRes = await request(app)
      .post('/api/v1/admin/rates/gold')
      .set('Authorization', `Bearer ${custToken}`)
      .send({ rate24k: 7600, rate22k: 6950 });

    assert.equal(custRes.status, 403);
    assert.equal(custRes.body.error.code, 'FORBIDDEN');

    // 4. Admin succeeds with 201
    const adminRes = await request(app)
      .post('/api/v1/admin/rates/gold')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rate24k: 7550.00,
        rate22k: 6920.00,
        rateChangePct: 0.85
      });

    assert.equal(adminRes.status, 201);
    assert.equal(adminRes.body.data.rate24k, 7550.00);

    // 5. Public feed reflects new rate
    const publicRes = await request(app).get('/api/v1/rates/gold');
    assert.equal(publicRes.body.data.rate24k, 7550.00);
  });

  it('6.3 Counter Cash Payment: POST /api/v1/admin/payments/record-cash records cash and updates ledger', async () => {
    // 1. Setup admin, scheme, customer, membership
    await User.create({ name: 'Admin', phone: '+919999900000', role: 'ADMIN' });
    const adminLogin = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919999900000', otp: '123456' });
    const adminToken = adminLogin.body.data.token;

    const scheme = await Scheme.create({
      name: 'Swastik Suvarna Varsha',
      targetAmount: 60000,
      durationMonths: 12,
      monthlyInstallment: 5000
    });

    const custUser = await User.create({ name: 'Walk-in Patron', phone: '+919876543210' });
    const membership = await Membership.create({
      userId: custUser._id,
      schemeId: scheme._id,
      tokenNumber: 15,
      customMonthlyEmi: 5000,
      targetAmount: 60000
    });

    // 2. Admin records cash payment
    const cashRes = await request(app)
      .post('/api/v1/admin/payments/record-cash')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        membershipId: membership._id.toString(),
        amount: 5000,
        monthFor: 1
      });

    assert.equal(cashRes.status, 201);
    assert.equal(cashRes.body.success, true);
    assert.equal(cashRes.body.data.paymentMethod, 'CASH');
    assert.equal(cashRes.body.data.status, 'SUCCESS');
    assert.ok(cashRes.body.data.transactionId.startsWith('TXN-CASH-'));

    // 3. Verify ledger and membership updated
    const updatedMembership = await Membership.findById(membership._id);
    assert.equal(updatedMembership.totalPaidAmount, 5000);
    assert.ok(updatedMembership.accumulatedGoldGrams > 0);

    // 4. Duplicate cash payment for Month 1 rejected
    const dupCashRes = await request(app)
      .post('/api/v1/admin/payments/record-cash')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        membershipId: membership._id.toString(),
        amount: 5000,
        monthFor: 1
      });

    assert.equal(dupCashRes.status, 400);
    assert.equal(dupCashRes.body.error.code, 'MONTH_ALREADY_PAID');
  });

  it('6.4 Lucky Draw: POST /api/v1/admin/draw/record-winner marks token as WINNER', async () => {
    await User.create({ name: 'Admin', phone: '+919999900000', role: 'ADMIN' });
    const adminLogin = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919999900000', otp: '123456' });
    const adminToken = adminLogin.body.data.token;

    const scheme = await Scheme.create({
      name: 'Swastik Suvarna Varsha',
      targetAmount: 60000,
      durationMonths: 12,
      monthlyInstallment: 5000
    });

    const custUser = await User.create({ name: 'Lucky Winner Patron', phone: '+919876543210' });
    const membership = await Membership.create({
      userId: custUser._id,
      schemeId: scheme._id,
      tokenNumber: 42,
      customMonthlyEmi: 5000,
      targetAmount: 60000
    });

    // Declare winner for Month 4 draw
    const drawRes = await request(app)
      .post('/api/v1/admin/draw/record-winner')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schemeId: scheme._id.toString(),
        tokenNumber: 42,
        month: 4
      });

    assert.equal(drawRes.status, 200);
    assert.equal(drawRes.body.success, true);
    assert.equal(drawRes.body.data.status, 'WINNER');
    assert.equal(drawRes.body.data.winMonth, 4);
    assert.equal(drawRes.body.data.chitToken, '#SW-042');
    assert.equal(drawRes.body.data.winnerName, 'Lucky Winner Patron');

    // Verify DB updated
    const updatedMembership = await Membership.findById(membership._id);
    assert.equal(updatedMembership.status, 'WINNER');
    assert.equal(updatedMembership.winMonth, 4);
  });

  it('6.5 Admin KYC Review: PATCH /api/v1/admin/kyc/:userId approves or rejects verification', async () => {
    await User.create({ name: 'Admin', phone: '+919999900000', role: 'ADMIN' });
    const adminLogin = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919999900000', otp: '123456' });
    const adminToken = adminLogin.body.data.token;

    const custUser = await User.create({
      name: 'Applicant Patron',
      phone: '+919876543210',
      kyc: {
        documentType: 'AADHAAR',
        documentNumberMasked: 'XXXX XXXX 9012',
        status: 'PENDING',
        isVerified: false
      }
    });

    // Approve KYC
    const reviewRes = await request(app)
      .patch(`/api/v1/admin/kyc/${custUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'VERIFIED' });

    assert.equal(reviewRes.status, 200);
    assert.equal(reviewRes.body.data.kyc.status, 'VERIFIED');
    assert.equal(reviewRes.body.data.kyc.isVerified, true);
    assert.ok(reviewRes.body.data.kyc.verifiedAt);
  });

});
