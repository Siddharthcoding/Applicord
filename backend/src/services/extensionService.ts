import { extractMetadataFromJobUrl } from '../utils/urlParser';
import { duplicateService } from './duplicateService';
import { applicationService } from './applicationService';
import { HistorySource, ApplicationStatus, WorkMode } from '@prisma/client';

export const extensionService = {
  async detectPageJob(userId: string, data: { url: string; pageTitle?: string; pageContent?: string }) {
    const extracted = extractMetadataFromJobUrl(data.url);
    
    // Check if the user is already tracking this job
    let duplicateInfo = null;
    if (extracted.company) {
      const dup = await duplicateService.checkDuplicate(userId, {
        company: extracted.company,
        jobTitle: extracted.jobTitle,
        jobId: extracted.jobId,
        jobUrl: data.url,
      });
      if (dup.hasDuplicate) {
        duplicateInfo = dup.existingApplication;
      }
    }

    return {
      detectedCompany: extracted.company || '',
      detectedRole: extracted.jobTitle || data.pageTitle || '',
      detectedJobId: extracted.jobId || '',
      detectedSource: extracted.source || 'BROWSER_EXTENSION',
      url: data.url,
      isAlreadyTracked: !!duplicateInfo,
      existingApplication: duplicateInfo,
    };
  },

  async trackFromExtension(userId: string, data: {
    company: string;
    jobTitle: string;
    jobUrl?: string;
    jobId?: string | null;
    location?: string | null;
    workMode?: WorkMode;
    source?: string;
    appliedAt?: string | Date;
    currentStatus?: ApplicationStatus;
  }) {
    return await applicationService.createApplication({
      userId,
      company: data.company,
      jobTitle: data.jobTitle,
      jobUrl: data.jobUrl || null,
      jobId: data.jobId || null,
      location: data.location || null,
      workMode: data.workMode || WorkMode.HYBRID,
      source: data.source || 'BROWSER_EXTENSION',
      appliedAt: data.appliedAt ? new Date(data.appliedAt) : new Date(),
      currentStatus: data.currentStatus || ApplicationStatus.APPLIED,
      creationSource: HistorySource.BROWSER_EXTENSION,
      scheduleFollowUp: true,
    });
  },
};
