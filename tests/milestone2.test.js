import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestDb, closeTestDb, clearTestDb } from './testDb.js';
import { User, Scheme, Membership, Payment, GoldRate } from '../src/models/index.js';

describe('💎 Milestone 2: Mongoose Database Models & Indexes Tests', () => {

  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('2.1 User Model: should create customer and enforce phone uniqueness', async () => {
    const user1 = await User.create({
      name: 'Rihan Patel',
      phone: '+919876543210'
    });

    assert.ok(user1._id);
    assert.equal(user1.name, 'Rihan Patel');
    assert.equal(user1.role, 'CUSTOMER');
    assert.equal(user1.kyc.status, 'NOT_SUBMITTED');
    assert.equal(user1.kyc.isVerified, false);

    // Enforce uniqueness
    await assert.rejects(
      async () => {
        await User.create({
          name: 'Duplicate Phone User',
          phone: '+919876543210'
        });
      },
      (err) => {
        return err.code === 11000;
      }
    );
  });

  it('2.2 Scheme Model: should store 11+1 scheme with bonus configuration and capacity', async () => {
    const scheme = await Scheme.create({
      name: 'Swastik Suvarna Varsha',
      targetAmount: 60000,
      durationMonths: 12,
      monthlyInstallment: 5000,
      maxCapacity: 100,
      currentMembers: 42,
      benefits: [
        '1 Month Free: 11 Paid + 12th Month 100% Jeweler Bonus',
        '25% Flat Discount on Jewellery Making Charges'
      ],
      hasBonusMonth: true,
      bonusAmount: 5000
    });

    assert.ok(scheme._id);
    assert.equal(scheme.name, 'Swastik Suvarna Varsha');
    assert.equal(scheme.targetAmount, 60000);
    assert.equal(scheme.durationMonths, 12);
    assert.equal(scheme.hasBonusMonth, true);
    assert.equal(scheme.isFull, false);
  });

  it('2.3 Membership Model: should generate chitToken virtual and block duplicate tokens', async () => {
    const user = await User.create({ name: 'Aarav', phone: '+919999911111' });
    const scheme = await Scheme.create({
      name: 'Royal Bridal Kitty',
      targetAmount: 360000,
      durationMonths: 12,
      monthlyInstallment: 30000
    });

    const membership = await Membership.create({
      userId: user._id,
      schemeId: scheme._id,
      tokenNumber: 42,
      customMonthlyEmi: 30000,
      targetAmount: 360000,
      joinedAtMonth: 1
    });

    // Check virtual chit token format (#SW-042)
    assert.equal(membership.chitToken, '#SW-042');

    // Ensure compound index exists and prevents assigning duplicate token #42 to another user in same scheme
    const user2 = await User.create({ name: 'Priya', phone: '+919999922222' });
    await assert.rejects(
      async () => {
        await Membership.create({
          userId: user2._id,
          schemeId: scheme._id,
          tokenNumber: 42, // Duplicate token in same scheme
          customMonthlyEmi: 30000,
          targetAmount: 360000,
          joinedAtMonth: 1
        });
      },
      (err) => err.code === 11000
    );
  });

  it('2.4 Payment Model: should record installment with gold grams allocation', async () => {
    const user = await User.create({ name: 'Sunil', phone: '+919888877777' });
    const scheme = await Scheme.create({
      name: 'Suvarna Varsha',
      targetAmount: 60000,
      durationMonths: 12,
      monthlyInstallment: 5000
    });
    const membership = await Membership.create({
      userId: user._id,
      schemeId: scheme._id,
      tokenNumber: 7,
      customMonthlyEmi: 5000,
      targetAmount: 60000
    });

    const payment = await Payment.create({
      membershipId: membership._id,
      userId: user._id,
      amount: 5000,
      monthFor: 1,
      paymentMethod: 'ONLINE',
      orderId: 'gokwik_ord_test_123',
      transactionId: 'TXN-SW-10821',
      goldRateAtPayment: 7122.50,
      goldGrams: 0.702,
      status: 'SUCCESS',
      paidAt: new Date()
    });

    assert.ok(payment._id);
    assert.equal(payment.amount, 5000);
    assert.equal(payment.monthFor, 1);
    assert.equal(payment.goldGrams, 0.702);
    assert.equal(payment.status, 'SUCCESS');
  });

  it('2.5 GoldRate Model: should persist official 24K and 22K benchmark rates', async () => {
    const rate = await GoldRate.create({
      rate24k: 7485.50,
      rate22k: 6860.00,
      rateChangePct: 0.62,
      benchmark: 'IBJA Official'
    });

    assert.ok(rate._id);
    assert.equal(rate.rate24k, 7485.50);
    assert.equal(rate.rate22k, 6860.00);
    assert.equal(rate.rateChangePct, 0.62);
  });

});
