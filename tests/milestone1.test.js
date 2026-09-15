import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('💎 Milestone 1: Architecture & Foundation Tests', () => {

  it('1.1 Root endpoint should return 200 with standard success envelope', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.message);
    assert.ok(res.body.data);
    assert.equal(res.body.data.name, 'Swastik Kitty API Gateway');
  });

  it('1.2 Health endpoint (/api/v1/health) should return 200 with HEALTHY status', async () => {
    const res = await request(app).get('/api/v1/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'HEALTHY');
    assert.equal(res.body.data.service, 'Swastik Kitty Backend API');
    assert.ok(res.body.data.timestamp);
  });

  it('1.3 Non-existent endpoint should return 404 with standard error envelope', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint-test');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'ROUTE_NOT_FOUND');
    assert.ok(res.body.message.includes('Cannot GET'));
  });

  it('1.4 Helmet security headers should be present on responses', async () => {
    const res = await request(app).get('/');
    assert.ok(res.headers['x-content-type-options']);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
  });

  it('1.5 CORS headers should allow cross-origin requests from mobile/web', async () => {
    const res = await request(app).options('/api/v1/health').set('Origin', 'http://localhost:3000');
    assert.equal(res.headers['access-control-allow-origin'], '*');
  });

});
