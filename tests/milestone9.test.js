import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDb, closeTestDb, clearTestDb } from './testDb.js';
import { User, Notification, GoldRate } from '../src/models/index.js';

describe('💎 Milestone 9: Phase 3 Notifications, Coins Catalog & Google Auth Tests', () => {

  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('9.1 Notifications Feed: GET /api/v1/notifications returns unreadCount and formatted notification list', async () => {
    const user = await User.create({ name: 'Patron Notif', phone: '+919876543210' });
    const loginRes = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919876543210', otp: '123456' });
    const token = loginRes.body.data.token;

    const now = Date.now();
    await Notification.create([
      {
        userId: user._id,
        title: 'Monthly Installment Due',
        body: 'Month 9 installment of ₹5,000 is due on Oct 15.',
        type: 'EMI_DUE',
        actionRoute: '/checkout',
        isRead: false,
        createdAt: new Date(now - 10000)
      },
      {
        userId: user._id,
        title: 'Payment Received',
        body: 'Month 8 payment of ₹5,000 verified. Receipt generated.',
        type: 'PAYMENT_SUCCESS',
        actionRoute: '/passbook',
        isRead: true,
        createdAt: new Date(now)
      }
    ]);

    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.unreadCount, 1);
    assert.equal(res.body.data.totalCount, 2);
    assert.equal(res.body.data.notifications.length, 2);
    assert.equal(res.body.data.notifications[0].title, 'Payment Received');
    assert.equal(res.body.data.notifications[1].title, 'Monthly Installment Due');
  });

  it('9.2 Mark Notification Read: PATCH /api/v1/notifications/:id/read sets isRead to true and decrements unreadCount', async () => {
    const user = await User.create({ name: 'Patron Notif', phone: '+919876543210' });
    const loginRes = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919876543210', otp: '123456' });
    const token = loginRes.body.data.token;

    const notif = await Notification.create({
      userId: user._id,
      title: 'Winner Alert',
      body: 'Token #SW-042 won Month 4 draw!',
      type: 'WINNER_ALERT',
      isRead: false
    });

    const res = await request(app)
      .patch(`/api/v1/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isRead, true);
    assert.equal(res.body.data.unreadCount, 0);

    const updated = await Notification.findById(notif._id);
    assert.equal(updated.isRead, true);
  });

  it('9.3 Mark All Read: PATCH /api/v1/notifications/read-all marks all notifications for user as read', async () => {
    const user = await User.create({ name: 'Patron Bulk Notif', phone: '+919876543210' });
    const loginRes = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '+919876543210', otp: '123456' });
    const token = loginRes.body.data.token;

    await Notification.create([
      { userId: user._id, title: 'Alert 1', body: 'Msg 1', isRead: false },
      { userId: user._id, title: 'Alert 2', body: 'Msg 2', isRead: false },
      { userId: user._id, title: 'Alert 3', body: 'Msg 3', isRead: false }
    ]);

    const res = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.markedReadCount, 3);
    assert.equal(res.body.data.unreadCount, 0);

    const remainingUnread = await Notification.countDocuments({ userId: user._id, isRead: false });
    assert.equal(remainingUnread, 0);
  });

  it('9.4 Dynamic Coins Catalog: GET /api/v1/coins computes prices accurately based on active 24K gold benchmark rate', async () => {
    // Benchmark 24K rate: ₹7,500/g
    await GoldRate.create({
      rate24k: 7500,
      rate22k: 6875,
      updatedAt: new Date()
    });

    const res = await request(app).get('/api/v1/coins');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.benchmarkRate24k, 7500);
    assert.ok(res.body.data.totalCoins > 0);

    // 1g Gold coin: 1g * 7500 + 350 making = 7850
    const coin1g = res.body.data.coins.find(c => c.id === 'COIN-GOLD-1G-999');
    assert.ok(coin1g);
    assert.equal(coin1g.basePrice, 7500);
    assert.equal(coin1g.unitPrice, 7850);
    assert.equal(coin1g.totalAmount, 7850);

    // 4g Gold coin: 4g * 7500 + 800 making = 30800
    const coin4g = res.body.data.coins.find(c => c.id === 'COIN-GOLD-4G-999');
    assert.ok(coin4g);
    assert.equal(coin4g.basePrice, 30000);
    assert.equal(coin4g.unitPrice, 30800);
  });

  it('9.5 Google Auth Exchange: POST /api/v1/auth/google registers new Google patron and issues signed JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({
        idToken: 'mock_google_id_token_xyz',
        email: 'patron.google@gmail.com',
        name: 'Google Patron User'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isNewUser, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, 'patron.google@gmail.com');
    assert.equal(res.body.data.user.name, 'Google Patron User');
    assert.equal(res.body.data.user.role, 'CUSTOMER');

    // Test token validity by hitting protected profile route
    const profileRes = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${res.body.data.token}`);

    assert.equal(profileRes.status, 200);
    assert.equal(profileRes.body.data.user.email, 'patron.google@gmail.com');
  });

  it('9.6 Google Auth Existing User: authenticates existing user by email and preserves user record', async () => {
    await User.create({
      name: 'Existing Google Patron',
      email: 'existing.patron@gmail.com',
      phone: '+919876543210'
    });

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({
        idToken: 'mock_google_id_token_abc',
        email: 'existing.patron@gmail.com'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isNewUser, false);
    assert.equal(res.body.data.user.name, 'Existing Google Patron');
    assert.equal(res.body.data.user.phone, '+919876543210');
  });

  it('9.7 Google Auth Validation: rejects request missing idToken or email with 400 Bad Request', async () => {
    const noTokenRes = await request(app)
      .post('/api/v1/auth/google')
      .send({ email: 'test@gmail.com' });

    assert.equal(noTokenRes.status, 400);
    assert.equal(noTokenRes.body.success, false);

    const badEmailRes = await request(app)
      .post('/api/v1/auth/google')
      .send({ idToken: 'some_token', email: 'invalid-email' });

    assert.equal(badEmailRes.status, 400);
    assert.equal(badEmailRes.body.success, false);
  });

});
