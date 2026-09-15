import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDb, closeTestDb, clearTestDb } from './testDb.js';
import { User } from '../src/models/index.js';

describe('💎 Milestone 3: Authentication, Security & KYC Module Tests', () => {

  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('3.1 Send OTP: should accept valid Indian phone number and return 200 with 300s expiry', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+919876543210' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.phone, '+919876543210');
    assert.equal(res.body.data.expiresInSeconds, 300);
  });

  it('3.2 Send OTP: should reject malformed phone numbers with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '12345' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.equal(res.body.error.details.field, 'phone');
  });

  it('3.3 Verify OTP: should authenticate valid OTP, register new user, and issue signed JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({
        phone: '+919876543210',
        otp: '123456'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.isNewUser, true);
    assert.equal(res.body.data.user.phone, '+919876543210');
    assert.equal(res.body.data.user.role, 'CUSTOMER');
    assert.equal(res.body.data.user.kyc.isVerified, false);

    // Verify user was stored in MongoDB
    const dbUser = await User.findOne({ phone: '+919876543210' });
    assert.ok(dbUser);
    assert.equal(dbUser.phone, '+919876543210');
  });

  it('3.4 AuthGuard: should reject protected route requests without Bearer token with 401', async () => {
    const res = await request(app).get('/api/v1/users/profile');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  it('3.5 AuthGuard: should allow access to protected profile with valid Bearer token', async () => {
    // 1. Log in
    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp: '123456' });

    const token = loginRes.body.data.token;

    // 2. Fetch profile
    const profileRes = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(profileRes.status, 200);
    assert.equal(profileRes.body.success, true);
    assert.equal(profileRes.body.data.user.phone, '+919876543210');
  });

  it('3.6 KYC Upload: should validate document and upload multipart form returning PENDING status', async () => {
    // 1. Log in
    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp: '123456' });

    const token = loginRes.body.data.token;

    // 2. Upload KYC multipart form
    const kycRes = await request(app)
      .post('/api/v1/users/kyc')
      .set('Authorization', `Bearer ${token}`)
      .field('documentType', 'AADHAAR')
      .field('documentNumber', '123456789012')
      .field('consentAgreed', 'true')
      .attach('file', Buffer.from('fake image content'), 'aadhaar.jpg');

    assert.equal(kycRes.status, 200);
    assert.equal(kycRes.body.success, true);
    assert.equal(kycRes.body.data.status, 'PENDING');
    assert.equal(kycRes.body.data.documentType, 'AADHAAR');
    assert.equal(kycRes.body.data.documentNumberMasked, 'XXXX XXXX 9012');
    assert.ok(kycRes.body.data.referenceId.startsWith('KYC-'));
    assert.ok(kycRes.body.data.documentUrl);

    // 3. Verify database updated
    const updatedUser = await User.findOne({ phone: '+919876543210' });
    assert.equal(updatedUser.kyc.status, 'PENDING');
    assert.equal(updatedUser.kyc.documentType, 'AADHAAR');
    assert.equal(updatedUser.kyc.documentNumberMasked, 'XXXX XXXX 9012');
  });

  it('3.7 Logout: should return 200 on authenticated logout request', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp: '123456' });

    const token = loginRes.body.data.token;

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);
  });

});
