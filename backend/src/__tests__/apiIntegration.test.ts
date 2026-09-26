import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

describe('Applicord API Integration Tests', () => {
  const app = createApp();

  it('GET /health should return 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.version).toBe('1.0.0');
  });

  it('Protected routes should block unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/applications');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/register should validate schema and reject invalid emails', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'not-an-email',
      password: 'short',
      name: '',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
