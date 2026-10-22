import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDb, closeTestDb, clearTestDb } from './testDb.js';
import { User, Scheme, Membership, Payment, GoldRate } from '../src/models/index.js';

describe('💎 Milestone 7: Phase 1 V2 Core Financials & Kitty Alignment Tests', () => {

  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('7.1 Profile Update: PUT /api/v1/users/profile updates name, surname, email, DOB', async () => {
    const user = await User.create({
      name: 'Rihan',
      phone: '+919876543210'
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp: '123456' });

    const token = loginRes.body.data.token;

    const updateRes = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Rihan',
        surname: 'Saifi',
        email: 'rihan@swastikjewel.com',
        dateOfBirth: '1995-08-15T00:00:00.000Z'
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.success, true);
    assert.equal(updateRes.body.data.user.name, 'Rihan');
    assert.equal(updateRes.body.data.user.surname, 'Saifi');
    assert.equal(updateRes.body.data.user.email, 'rihan@swastikjewel.com');
    assert.ok(updateRes.body.data.user.dateOfBirth.startsWith('1995-08-15'));
    assert.equal(updateRes.body.data.user.phone, '+919876543210');

    // Verify GET profile also reflects the changes
    const getRes = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.user.surname, 'Saifi');
    assert.equal(getRes.body.data.user.email, 'rihan@swastikjewel.com');
  });

  it('7.2 Profile Update Validation: rejects invalid name and invalid email format', async () => {
    await User.create({ name: 'Rihan', phone: '+919876543210' });

    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp: '123456' });

    const token = loginRes.body.data.token;

    // Short name
    const shortNameRes = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'R' });

    assert.equal(shortNameRes.status, 400);
    assert.equal(shortNameRes.body.success, false);

    // Invalid email
    const badEmailRes = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Rihan', email: 'not-an-email' });

    assert.equal(badEmailRes.status, 400);
    assert.equal(badEmailRes.body.success, false);
  });

  it('7.3 Numbers Grid: GET /api/v1/schemes/:id/numbers returns slots 01-50 with statuses', async () => {
    const user = await User.create({ name: 'Rihan', phone: '+919876543210' });
    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp: '123456' });
    const token = loginRes.body.data.token;

    const scheme = await Scheme.create({
      name: 'Suvarna Varsha 50',
      targetAmount: 60000,
      monthlyInstallment: 5000,
      durationMonths: 12,
      totalSlots: 50,
      maxCapacity: 50
    });

    // Book slot 7
    await Membership.create({
      userId: user._id,
      schemeId: scheme._id,
      tokenNumber: 7,
      kittyNumber: 7,
      customMonthlyEmi: 5000,
      targetAmount: 60000,
      joinedAtMonth: 1
    });

    const res = await request(app)
      .get(`/api/v1/schemes/${scheme._id}/numbers`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.totalSlots, 50);
    assert.equal(res.body.data.numbers.length, 50);

    // Slot 1 should be AVAILABLE
    const slot1 = res.body.data.numbers.find(n => n.number === 1);
    assert.equal(slot1.status, 'AVAILABLE');
    assert.equal(slot1.label, '01');

    // Slot 7 should be BOOKED with chitToken #SW-007
    const slot7 = res.body.data.numbers.find(n => n.number === 7);
    assert.equal(slot7.status, 'BOOKED');
    assert.equal(slot7.label, '07');
    assert.equal(slot7.chitToken, '#SW-007');
  });

  it('7.4 Atomic Kitty Selection: join accepts selectedNumber, blocks duplicate selection with 409', async () => {
    const user1 = await User.create({ name: 'User One', phone: '+919876500001' });
    const user2 = await User.create({ name: 'User Two', phone: '+919876500002' });

    const login1 = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919876500001', otp: '123456' });
    const login2 = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919876500002', otp: '123456' });

    const scheme = await Scheme.create({
      name: 'Suvarna Varsha',
      targetAmount: 60000,
      monthlyInstallment: 5000,
      durationMonths: 12,
      totalSlots: 50
    });

    // User 1 chooses slot 15
    const joinRes1 = await request(app)
      .post('/api/v1/memberships/join')
      .set('Authorization', `Bearer ${login1.body.data.token}`)
      .send({ schemeId: scheme._id.toString(), selectedNumber: 15 });

    assert.equal(joinRes1.status, 201);
    assert.equal(joinRes1.body.data.membership.tokenNumber, 15);
    assert.equal(joinRes1.body.data.membership.kittyNumber, 15);
    assert.equal(joinRes1.body.data.membership.chitToken, '#SW-015');

    // User 2 tries to choose the exact same slot 15
    const joinRes2 = await request(app)
      .post('/api/v1/memberships/join')
      .set('Authorization', `Bearer ${login2.body.data.token}`)
      .send({ schemeId: scheme._id.toString(), selectedNumber: 15 });

    assert.equal(joinRes2.status, 409);
    assert.equal(joinRes2.body.success, false);
    assert.equal(joinRes2.body.error.code, 'NUMBER_ALREADY_TAKEN');
  });

  it('7.5 Multi-Month Payment: initiates payment for months [1, 2] with authoritative 2x EMI calculation', async () => {
    const user = await User.create({ name: 'Patron Multi', phone: '+919876543210' });
    const loginRes = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919876543210', otp: '123456' });
    const token = loginRes.body.data.token;

    const scheme = await Scheme.create({
      name: 'Suvarna Varsha',
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
      joinedAtMonth: 1
    });

    const paymentRes = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        membershipId: membership._id.toString(),
        months: [1, 2]
      });

    assert.equal(paymentRes.status, 200);
    assert.equal(paymentRes.body.success, true);
    assert.equal(paymentRes.body.data.amount, 10000); // 2 * 5000
    assert.deepEqual(paymentRes.body.data.months, [1, 2]);

    const paymentRecord = await Payment.findOne({ orderId: paymentRes.body.data.orderId });
    assert.ok(paymentRecord);
    assert.equal(paymentRecord.amount, 10000);
    assert.deepEqual(paymentRecord.monthsPaid, [1, 2]);
  });

  it('7.6 Consecutive Order Enforcement: rejects skipped months (e.g. paying month 2 when month 1 unpaid)', async () => {
    const user = await User.create({ name: 'Patron Strict', phone: '+919876543210' });
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
      tokenNumber: 1,
      customMonthlyEmi: 5000,
      targetAmount: 60000,
      joinedAtMonth: 1
    });

    // Try paying Month 2 directly while Month 1 is unpaid
    const skippedRes = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        membershipId: membership._id.toString(),
        months: [2]
      });

    assert.equal(skippedRes.status, 400);
    assert.equal(skippedRes.body.success, false);
    assert.equal(skippedRes.body.error.code, 'NON_CONSECUTIVE_MONTHS_REJECTED');

    // Try paying [1, 3] (non-consecutive array)
    const nonConsecRes = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        membershipId: membership._id.toString(),
        months: [1, 3]
      });

    assert.equal(nonConsecRes.status, 400);
    assert.equal(nonConsecRes.body.error.code, 'NON_CONSECUTIVE_MONTHS_REJECTED');
  });

  it('7.7 Multi-Month Webhook Ledger: marks all months in monthsPaid as SUCCESS and credits passbook', async () => {
    await GoldRate.create({ rate24k: 7500, rate22k: 6875, updatedAt: new Date() });

    const user = await User.create({ name: 'Patron Webhook', phone: '+919876543210' });
    const scheme = await Scheme.create({
      name: 'Suvarna Varsha',
      targetAmount: 60000,
      monthlyInstallment: 5000,
      durationMonths: 12
    });

    const membership = await Membership.create({
      userId: user._id,
      schemeId: scheme._id,
      tokenNumber: 1,
      customMonthlyEmi: 5000,
      targetAmount: 60000,
      joinedAtMonth: 1,
      totalPaidAmount: 0
    });

    const orderId = 'gokwik_multi_test_01';
    await Payment.create({
      membershipId: membership._id,
      userId: user._id,
      amount: 10000,
      monthFor: 1,
      monthsPaid: [1, 2],
      orderId,
      status: 'PENDING',
      paymentMethod: 'ONLINE'
    });

    // Webhook confirmation
    const webhookRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-gokwik-signature', 'test_signature')
      .send({
        orderId,
        status: 'SUCCESS',
        transactionId: 'TXN-GOKWIK-MULTI-01'
      });

    assert.equal(webhookRes.status, 200);
    assert.equal(webhookRes.body.success, true);

    const updatedPayment = await Payment.findOne({ orderId });
    assert.equal(updatedPayment.status, 'SUCCESS');
    assert.equal(updatedPayment.transactionId, 'TXN-GOKWIK-MULTI-01');

    const updatedMembership = await Membership.findById(membership._id);
    assert.equal(updatedMembership.totalPaidAmount, 10000);

    // Verify dashboard synthesizes both Month 1 and Month 2 as PAID
    const loginRes = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919876543210', otp: '123456' });
    const dashRes = await request(app)
      .get('/api/v1/memberships/my-dashboard')
      .set('Authorization', `Bearer ${loginRes.body.data.token}`);

    assert.equal(dashRes.status, 200);
    const passbook = dashRes.body.data.dashboard.passbook;
    const m1 = passbook.find(p => p.month === 1);
    const m2 = passbook.find(p => p.month === 2);
    const m3 = passbook.find(p => p.month === 3);

    assert.equal(m1.status, 'PAID');
    assert.equal(m2.status, 'PAID');
    assert.equal(m3.status, 'CURRENT');
  });

  it('7.8 Multi-Scheme Dashboard: returns both primary dashboard and memberships array', async () => {
    const user = await User.create({ name: 'Multi Scheme Patron', phone: '+919876543210' });
    const loginRes = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919876543210', otp: '123456' });
    const token = loginRes.body.data.token;

    const scheme1 = await Scheme.create({ name: 'Scheme 1', targetAmount: 60000, monthlyInstallment: 5000, durationMonths: 12 });
    const scheme2 = await Scheme.create({ name: 'Scheme 2', targetAmount: 120000, monthlyInstallment: 10000, durationMonths: 12 });

    await Membership.create({
      userId: user._id,
      schemeId: scheme1._id,
      tokenNumber: 5,
      kittyNumber: 5,
      customMonthlyEmi: 5000,
      targetAmount: 60000,
      joinedAtMonth: 1
    });

    await Membership.create({
      userId: user._id,
      schemeId: scheme2._id,
      tokenNumber: 18,
      kittyNumber: 18,
      customMonthlyEmi: 10000,
      targetAmount: 120000,
      joinedAtMonth: 1
    });

    const res = await request(app)
      .get('/api/v1/memberships/my-dashboard')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.hasActiveScheme, true);
    assert.equal(res.body.data.totalActiveSchemes, 2);
    assert.ok(res.body.data.dashboard);
    assert.equal(res.body.data.memberships.length, 2);
    assert.equal(res.body.data.memberships[0].kittyNumber, 5);
    assert.equal(res.body.data.memberships[1].kittyNumber, 18);
  });

});
