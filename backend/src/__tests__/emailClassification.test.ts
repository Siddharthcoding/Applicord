import { describe, it, expect } from 'vitest';
import { emailClassificationService } from '../services/emailClassificationService';
import { EmailClassification } from '@prisma/client';

describe('Email Classification & Entity Extraction Service', () => {
  it('should accurately classify coding assessment invitations', () => {
    const email = {
      sender: 'recruiting@microsoft.com',
      subject: 'Microsoft Coding Assessment Invitation for Software Engineer',
      snippet: 'Please complete your HackerRank technical assessment challenge within 5 business days.',
      body: 'Hi Candidate, Please find the link to your online test...',
    };

    const result = emailClassificationService.classify(email);
    expect(result.classification).toBe(EmailClassification.ASSESSMENT);
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    expect(result.detectedCompany).toBe('Microsoft');
  });

  it('should accurately classify interview invitations', () => {
    const email = {
      sender: 'talent@stripe.com',
      subject: 'Interview Invitation: Backend Engineer at Stripe',
      snippet: 'We would love to schedule a technical interview loop with our engineering leads.',
      body: 'Please choose a slot on our calendar...',
    };

    const result = emailClassificationService.classify(email);
    expect(result.classification).toBe(EmailClassification.INTERVIEW);
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    expect(result.detectedCompany).toBe('Stripe');
  });

  it('should accurately classify rejection emails', () => {
    const email = {
      sender: 'careers@google.com',
      subject: 'Update regarding your application for Software Engineer at Google',
      snippet: 'Thank you for applying. Unfortunately, we have decided to pursue other candidates at this time.',
      body: 'We wish you the best in your job search.',
    };

    const result = emailClassificationService.classify(email);
    expect(result.classification).toBe(EmailClassification.REJECTION);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.detectedCompany).toBe('Google');
  });

  it('should accurately classify formal job offers', () => {
    const email = {
      sender: 'hr@datadoghq.com',
      subject: 'Offer of Employment: Senior Frontend Engineer at Datadog',
      snippet: 'We are pleased to offer you the position of Senior Frontend Engineer. Formal offer letter attached.',
      body: 'Congratulations!',
    };

    const result = emailClassificationService.classify(email);
    expect(result.classification).toBe(EmailClassification.OFFER);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });
});
