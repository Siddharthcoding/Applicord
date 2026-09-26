import { prisma } from '../config/prisma';

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  matchType?: 'STRONG' | 'SECONDARY';
  existingApplication?: {
    id: string;
    publicId: string;
    companyName: string;
    jobTitle: string;
    appliedAt: Date;
    currentStatus: string;
    jobUrl?: string | null;
  };
}

export const duplicateService = {
  async checkDuplicate(userId: string, data: {
    company: string;
    jobTitle?: string;
    jobId?: string | null;
    jobUrl?: string | null;
  }): Promise<DuplicateCheckResult> {
    const trimmedCompany = data.company.trim().toLowerCase();
    const trimmedJobId = data.jobId?.trim();
    const trimmedJobTitle = data.jobTitle?.trim().toLowerCase();
    const trimmedJobUrl = data.jobUrl?.trim();

    // 1. Find matching company ID
    const company = await prisma.company.findFirst({
      where: {
        name: {
          equals: trimmedCompany,
          mode: 'insensitive',
        },
      },
    });

    if (!company) {
      return { hasDuplicate: false };
    }

    // 2. Strong Match: Same User + Same Company + Same Job ID
    if (trimmedJobId) {
      const strongMatch = await prisma.application.findFirst({
        where: {
          userId,
          companyId: company.id,
          jobId: trimmedJobId,
        },
        include: {
          company: true,
        },
      });

      if (strongMatch) {
        return {
          hasDuplicate: true,
          matchType: 'STRONG',
          existingApplication: {
            id: strongMatch.id,
            publicId: strongMatch.publicId,
            companyName: strongMatch.company.name,
            jobTitle: strongMatch.jobTitle,
            appliedAt: strongMatch.appliedAt,
            currentStatus: strongMatch.currentStatus,
            jobUrl: strongMatch.jobUrl,
          },
        };
      }
    }

    // 3. Secondary Match: Same User + Same Company + Similar Job Title or Same URL
    if (trimmedJobTitle || trimmedJobUrl) {
      const candidates = await prisma.application.findMany({
        where: {
          userId,
          companyId: company.id,
        },
        include: {
          company: true,
        },
      });

      for (const app of candidates) {
        // Same URL match
        if (trimmedJobUrl && app.jobUrl && app.jobUrl.toLowerCase() === trimmedJobUrl.toLowerCase()) {
          return {
            hasDuplicate: true,
            matchType: 'SECONDARY',
            existingApplication: {
              id: app.id,
              publicId: app.publicId,
              companyName: app.company.name,
              jobTitle: app.jobTitle,
              appliedAt: app.appliedAt,
              currentStatus: app.currentStatus,
              jobUrl: app.jobUrl,
            },
          };
        }

        // Title similarity match (simple normalized token overlap)
        if (trimmedJobTitle) {
          const title1Words = new Set(trimmedJobTitle.split(/\s+/).filter(w => w.length > 2));
          const title2Words = new Set(app.jobTitle.toLowerCase().split(/\s+/).filter(w => w.length > 2));
          
          let intersection = 0;
          title1Words.forEach(w => {
            if (title2Words.has(w)) intersection++;
          });

          const similarity = intersection / Math.max(title1Words.size, title2Words.size, 1);
          if (similarity >= 0.7 || trimmedJobTitle === app.jobTitle.toLowerCase()) {
            return {
              hasDuplicate: true,
              matchType: 'SECONDARY',
              existingApplication: {
                id: app.id,
                publicId: app.publicId,
                companyName: app.company.name,
                jobTitle: app.jobTitle,
                appliedAt: app.appliedAt,
                currentStatus: app.currentStatus,
                jobUrl: app.jobUrl,
              },
            };
          }
        }
      }
    }

    return { hasDuplicate: false };
  },
};
