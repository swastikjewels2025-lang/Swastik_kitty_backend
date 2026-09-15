import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDb, closeTestDb, clearTestDb } from './testDb.js';
import { User, Scheme, Membership, Payment, GoldRate } from '../src/models/index.js';
import { generateReceiptPdf } from '../src/services/receipt.service.js';

describe('💎 Milestone 5: Payments, Reconciliation Polling, Webhooks & PDF Receipts Tests', () => {

  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('5.1 Payment Order Initiation: POST /api/v1/payments/initiate should create PENDING payment', async () => {
    // 1. Setup Gold Rate & Scheme
    await GoldRate.create({ rate24k: 7485.50, rate22k: 6860.00 });
    const scheme = await Scheme.create({
      name: 'Swastik Suvarna Varsha',
      targetAmount: 60000,
      durationMonths: 12,
      monthlyInstallment: 5000,
      hasBonusMonth: true,
      bonusAmount: 5000
    });

    // 2. User login & join
    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp: '123456' });

    const token = loginRes.body.data.token;
    await User.updateOne({ phone: '+919876543210' }, { 'kyc.isVerified': true, 'kyc.status': 'VERIFIED' });

    const joinRes = await request(app)
      .post('/api/v1/memberships/join')
      .set('Authorization', `Bearer ${token}`)
      .send({ schemeId: scheme._id.toString(), joinedAtMonth: 1 });

    const membershipId = joinRes.body.data.membership.id;

    // 3. Initiate payment for Month 1
    const payRes = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        membershipId,
        monthFor: 1,
        paymentMethod: 'ONLINE'
      });

    assert.equal(payRes.status, 200);
    assert.equal(payRes.body.success, true);
    assert.ok(payRes.body.data.orderId.startsWith('gokwik_ord_'));
    assert.equal(payRes.body.data.amount, 5000);
    assert.equal(payRes.body.data.currency, 'INR');

    // 4. Verify PENDING payment in DB
    const dbPayment = await Payment.findOne({ orderId: payRes.body.data.orderId });
    assert.ok(dbPayment);
    assert.equal(dbPayment.status, 'PENDING');
    assert.equal(dbPayment.amount, 5000);

    // 5. Attempting to pay for Month 12 (bonus month) should be rejected
    const bonusPayRes = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        membershipId,
        monthFor: 12
      });

    assert.equal(bonusPayRes.status, 400);
    assert.equal(bonusPayRes.body.error.code, 'BONUS_MONTH_NOT_PAYABLE');
  });

  it('5.2 Payment Polling: GET /api/v1/payments/status/:orderId should return live status', async () => {
    const scheme = await Scheme.create({
      name: 'Swastik Suvarna Varsha',
      targetAmount: 60000,
      durationMonths: 12,
      monthlyInstallment: 5000
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp: '123456' });

    const token = loginRes.body.data.token;
    await User.updateOne({ phone: '+919876543210' }, { 'kyc.isVerified': true, 'kyc.status': 'VERIFIED' });

    const joinRes = await request(app)
      .post('/api/v1/memberships/join')
      .set('Authorization', `Bearer ${token}`)
      .send({ schemeId: scheme._id.toString(), joinedAtMonth: 1 });

    const membershipId = joinRes.body.data.membership.id;

    const payRes = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ membershipId, monthFor: 1 });

    const orderId = payRes.body.data.orderId;

    // Check polling status
    const statusRes = await request(app)
      .get(`/api/v1/payments/status/${orderId}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.success, true);
    assert.equal(statusRes.body.data.orderId, orderId);
    assert.equal(statusRes.body.data.status, 'PENDING');
  });

  it('5.3 Webhook & ACID Ledger: POST /api/v1/payments/webhook should commit payment, credit gold grams and update membership', async () => {
    // 1. Setup rate & scheme
    await GoldRate.create({ rate24k: 7500.00, rate22k: 6875.00 });
    const scheme = await Scheme.create({
      name: 'Swastik Suvarna Varsha',
      targetAmount: 60000,
      durationMonths: 12,
      monthlyInstallment: 5000,
      hasBonusMonth: true,
      bonusAmount: 5000
    });

    // 2. User login & join
    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp: '123456' });

    const token = loginRes.body.data.token;
    await User.updateOne({ phone: '+919876543210' }, { 'kyc.isVerified': true, 'kyc.status': 'VERIFIED' });

    const joinRes = await request(app)
      .post('/api/v1/memberships/join')
      .set('Authorization', `Bearer ${token}`)
      .send({ schemeId: scheme._id.toString(), joinedAtMonth: 1 });

    const membershipId = joinRes.body.data.membership.id;

    // 3. Initiate payment
    const payRes = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ membershipId, monthFor: 1 });

    const orderId = payRes.body.data.orderId;

    // 4. Simulate GoKwik webhook POST
    const webhookRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-gokwik-signature', 'test_signature')
      .send({
        orderId,
        status: 'SUCCESS',
        transactionId: 'TXN-GOKWIK-998811'
      });

    assert.equal(webhookRes.status, 200);
    assert.equal(webhookRes.body.success, true);
    assert.equal(webhookRes.body.data.transactionId, 'TXN-GOKWIK-998811');

    // 5. Verify Payment in DB changed to SUCCESS with gold credited
    const updatedPayment = await Payment.findOne({ orderId });
    assert.equal(updatedPayment.status, 'SUCCESS');
    assert.equal(updatedPayment.transactionId, 'TXN-GOKWIK-998811');
    assert.equal(updatedPayment.goldRateAtPayment, 7500.00);
    // ₹5,000 / ₹7,500 = 0.667 grams
    assert.equal(updatedPayment.goldGrams, 0.667);
    assert.ok(updatedPayment.receiptUrl);

    // 6. Verify Membership totalPaidAmount incremented to 5000 and gold grams credited
    const updatedMembership = await Membership.findById(membershipId);
    assert.equal(updatedMembership.totalPaidAmount, 5000);
    assert.equal(updatedMembership.accumulatedGoldGrams, 0.667);

    // 7. Test Idempotency: Duplicate webhook calls should not double-credit
    const dupWebhookRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-gokwik-signature', 'test_signature')
      .send({ orderId, status: 'SUCCESS' });

    assert.equal(dupWebhookRes.status, 200);
    assert.equal(dupWebhookRes.body.data.alreadyProcessed, true);

    const checkMembershipAgain = await Membership.findById(membershipId);
    assert.equal(checkMembershipAgain.totalPaidAmount, 5000); // Still 5000!

    // 8. Verify Polling endpoint now reports SUCCESS
    const finalStatusRes = await request(app)
      .get(`/api/v1/payments/status/${orderId}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(finalStatusRes.body.data.status, 'SUCCESS');
    assert.equal(finalStatusRes.body.data.totalPaidAmount, 5000);
    assert.equal(finalStatusRes.body.data.monthsPaid, 1);
  });

  it('5.4 PDFKit Receipt Generation: generateReceiptPdf should create a valid printable PDF buffer', async () => {
    const pdfBuffer = await generateReceiptPdf({
      receiptId: '10821',
      customerName: 'Rihan Patel',
      customerPhone: '+919876543210',
      chitToken: '#SW-042',
      schemeName: 'Swastik Suvarna Varsha',
      monthFor: 1,
      amount: 5000,
      paymentMethod: 'ONLINE',
      transactionId: 'TXN-SW-10821',
      goldRateAtPayment: 7485.50,
      goldGrams: 0.668,
      totalPaidAmount: 5000,
      accumulatedGoldGrams: 0.668
    });

    assert.ok(pdfBuffer);
    assert.ok(pdfBuffer.length > 1000);
    // PDF magic bytes: %PDF-
    assert.equal(pdfBuffer.subarray(0, 5).toString(), '%PDF-');
  });

});
