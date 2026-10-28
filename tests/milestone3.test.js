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

  it('3.8 Google Sign-In: should exchange Google credentials and return JWT with user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({
        idToken: 'mock_google_id_token_test_123',
        email: 'swastik.patron@gmail.com',
        name: 'Aarav Sharma',
        googleId: 'google_sub_123456'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, 'swastik.patron@gmail.com');
    assert.equal(res.body.data.user.authProvider, 'GOOGLE');
  });

  it('3.9 Apple Sign-In: should exchange Apple credentials and return JWT with user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/apple')
      .send({
        identityToken: 'mock_apple_identity_token_test_456',
        userIdentifier: 'apple_user_id_7890',
        email: 'aarav@privaterelay.appleid.com',
        name: 'Aarav Apple'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.authProvider, 'APPLE');
  });

  it('3.10 Link Phone: should verify OTP and bind Indian mobile number to account', async () => {
    // 1. Authenticate with Google
    const googleRes = await request(app)
      .post('/api/v1/auth/google')
      .send({
        idToken: 'mock_google_token_link',
        email: 'link.patron@gmail.com',
        name: 'Link Patron',
        googleId: 'google_link_999'
      });

    const token = googleRes.body.data.token;

    // 2. Link Phone number with OTP
    const linkRes = await request(app)
      .post('/api/v1/auth/link-phone')
      .set('Authorization', `Bearer ${token}`)
      .send({
        phone: '+919876500000',
        otp: '123456'
      });

    assert.equal(linkRes.status, 200);
    assert.equal(linkRes.body.success, true);
    assert.equal(linkRes.body.data.user.phone, '+919876500000');
  });

});
