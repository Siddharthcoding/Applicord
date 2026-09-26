import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

describe('Auth & Password Reset Flow Tests', () => {
  const app = createApp();

  it('POST /api/v1/auth/register should fail when passwords do not match', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'mismatch@applylog.test',
      password: 'password123',
      confirmPassword: 'differentPassword456',
      name: 'Mismatch User',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.confirmPassword).toContain('Passwords do not match');
  });

  it('POST /api/v1/auth/forgot-password should return success response without leaking user existence', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({
      email: 'nonexistent@applylog.test',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('password reset link has been generated');
  });

  it('POST /api/v1/auth/reset-password should reject invalid reset tokens', async () => {
    const res = await request(app).post('/api/v1/auth/reset-password').send({
      token: 'fake-invalid-or-expired-token',
      newPassword: 'brandNewPassword123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid or expired password reset link');
  });
});
