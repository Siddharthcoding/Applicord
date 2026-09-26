import { describe, it, expect } from 'vitest';
import { mailService } from '../services/mailService';

describe('MailService Email Delivery Tests', () => {
  it('should successfully dispatch a formatted password reset email', async () => {
    const success = await mailService.sendPasswordResetEmail({
      to: 'candidate@example.com',
      name: 'Alex Johnson',
      resetUrl: 'http://localhost:5173/reset-password?token=sample-reset-token-123',
      expiresMinutes: 60,
    });

    expect(success).toBe(true);
  });

  it('should successfully dispatch a formatted reminder email', async () => {
    const success = await mailService.sendReminderEmail({
      to: 'candidate@example.com',
      name: 'Alex Johnson',
      reminderTitle: 'Follow up with recruiter after technical screen',
      dueAt: new Date(Date.now() + 86400000),
      companyName: 'Stripe',
      jobTitle: 'Senior Infrastructure Engineer',
      viewUrl: '/applications/sample-app-id',
      reminderType: 'FOLLOW_UP',
    });

    expect(success).toBe(true);
  });

  it('should successfully dispatch a custom raw email', async () => {
    const success = await mailService.sendMail({
      to: 'user@example.com',
      subject: 'Test Notification',
      text: 'This is a test notification from Applicord.',
    });

    expect(success).toBe(true);
  });
});
