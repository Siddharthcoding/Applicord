import { describe, it, expect } from 'vitest';
import { extractMetadataFromJobUrl } from '../utils/urlParser';

describe('Job URL Intelligence Extractor', () => {
  it('should parse LinkedIn job links and extract job ID and source', () => {
    const url = 'https://www.linkedin.com/jobs/view/3849102941/?refId=feed';
    const result = extractMetadataFromJobUrl(url);

    expect(result.source).toBe('LINKEDIN');
    expect(result.jobId).toBe('3849102941');
  });

  it('should parse Greenhouse job boards and extract company and job ID', () => {
    const url = 'https://boards.greenhouse.io/airbnb/jobs/5201948';
    const result = extractMetadataFromJobUrl(url);

    expect(result.source).toBe('COMPANY_WEBSITE');
    expect(result.company).toBe('Airbnb');
    expect(result.jobId).toBe('5201948');
  });

  it('should parse Lever job boards and extract company and job ID', () => {
    const url = 'https://jobs.lever.co/stripe/8df291c0-42ab-4122';
    const result = extractMetadataFromJobUrl(url);

    expect(result.source).toBe('COMPANY_WEBSITE');
    expect(result.company).toBe('Stripe');
    expect(result.jobId).toBe('8df291c0-42ab-4122');
  });

  it('should parse Indeed job listings and extract job key and source', () => {
    const url = 'https://www.indeed.com/viewjob?jk=9a3b827f10c';
    const result = extractMetadataFromJobUrl(url);

    expect(result.source).toBe('INDEED');
    expect(result.jobId).toBe('9a3b827f10c');
  });
});
