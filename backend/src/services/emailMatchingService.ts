import { prisma } from '../config/prisma';
import { Application } from '@prisma/client';

export interface MatchingResult {
  application: Application | null;
  matchScore: number;
  matchReason: string;
}

export const emailMatchingService = {
  async matchEmailToApplication(
    userId: string,
    extracted: {
      detectedCompany?: string;
      detectedRole?: string;
      sender: string;
      subject: string;
    }
  ): Promise<MatchingResult> {
    const activeApplications = await prisma.application.findMany({
      where: {
        userId,
        isArchived: false,
      },
      include: {
        company: true,
      },
      orderBy: { appliedAt: 'desc' },
    });

    if (activeApplications.length === 0) {
      return { application: null, matchScore: 0, matchReason: 'No active applications found' };
    }

    let bestMatch: Application | null = null;
    let highestScore = 0;
    let bestReason = '';

    const senderDomain = extracted.sender.includes('@')
      ? extracted.sender.split('@')[1].toLowerCase()
      : '';

    for (const app of activeApplications) {
      let score = 0;
      const reasons: string[] = [];

      const companyName = app.company.name.toLowerCase();

      // 1. Company Name Match
      if (extracted.detectedCompany) {
        const detectedComp = extracted.detectedCompany.toLowerCase();
        if (companyName === detectedComp || companyName.includes(detectedComp) || detectedComp.includes(companyName)) {
          score += 50;
          reasons.push(`Matched company "${app.company.name}"`);
        }
      } else if (extracted.subject.toLowerCase().includes(companyName)) {
        score += 40;
        reasons.push(`Found company "${app.company.name}" in email subject`);
      }

      // 2. Domain Match
      if (senderDomain && (senderDomain.includes(companyName.replace(/\s+/g, '')) || (app.company.website && app.company.website.toLowerCase().includes(senderDomain)))) {
        score += 30;
        reasons.push(`Sender domain "${senderDomain}" matches company domain`);
      }

      // 3. Role / Job Title Match
      if (extracted.detectedRole) {
        const detectedRole = extracted.detectedRole.toLowerCase();
        const appTitle = app.jobTitle.toLowerCase();
        if (appTitle === detectedRole || appTitle.includes(detectedRole) || detectedRole.includes(appTitle)) {
          score += 20;
          reasons.push(`Matched role "${app.jobTitle}"`);
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = app;
        bestReason = reasons.join('; ');
      }
    }

    const normalizedScore = Math.min(highestScore / 100, 1.0);

    return {
      application: bestMatch,
      matchScore: normalizedScore,
      matchReason: bestReason || 'No confident match found',
    };
  },
};
