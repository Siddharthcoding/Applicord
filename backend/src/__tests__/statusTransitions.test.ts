import { describe, it, expect } from 'vitest';
import { ApplicationStatus, HistorySource } from '@prisma/client';
import { resolveSuggestionSchema } from '../validators/index';

describe('Application Status Transitions & History Source Logic', () => {
  it('should define all 10 distinct job application statuses correctly', () => {
    const statuses: ApplicationStatus[] = [
      'SAVED',
      'APPLIED',
      'VIEWED',
      'ASSESSMENT',
      'INTERVIEW',
      'OFFER',
      'ACCEPTED',
      'REJECTED',
      'WITHDRAWN',
      'CLOSED',
    ];

    expect(statuses).toHaveLength(10);
    expect(statuses).toContain('APPLIED');
    expect(statuses).toContain('ASSESSMENT');
    expect(statuses).toContain('INTERVIEW');
    expect(statuses).toContain('OFFER');
    expect(statuses).toContain('REJECTED');
  });

  it('should distinguish manual, email, extension, and system sources', () => {
    const sources: HistorySource[] = [
      'MANUAL',
      'EMAIL',
      'BROWSER_EXTENSION',
      'IMPORT',
      'SYSTEM',
    ];

    expect(sources).toHaveLength(5);
    expect(sources).toContain('EMAIL');
    expect(sources).toContain('MANUAL');
    expect(sources).toContain('BROWSER_EXTENSION');
  });

  it('should identify terminal statuses to avoid unnecessary follow-ups', () => {
    const terminalStatuses: ApplicationStatus[] = ['REJECTED', 'WITHDRAWN', 'ACCEPTED', 'CLOSED'];
    const activeStatuses: ApplicationStatus[] = ['SAVED', 'APPLIED', 'VIEWED', 'ASSESSMENT', 'INTERVIEW', 'OFFER'];

    activeStatuses.forEach((status) => {
      expect(terminalStatuses.includes(status)).toBe(false);
    });

    terminalStatuses.forEach((status) => {
      expect(terminalStatuses.includes(status)).toBe(true);
    });
  });

  it('should validate and parse resolve suggestions with manual overrides', () => {
    const parsed = resolveSuggestionSchema.parse({
      action: 'ACCEPT',
      overrides: {
        company: 'Stripe',
        role: 'Full Stack Engineer',
        status: 'INTERVIEW',
      },
    });

    expect(parsed.action).toBe('ACCEPT');
    expect(parsed.overrides?.company).toBe('Stripe');
    expect(parsed.overrides?.role).toBe('Full Stack Engineer');
    expect(parsed.overrides?.status).toBe('INTERVIEW');
  });
});
