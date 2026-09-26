import { prisma } from '../config/prisma';
import {
  SuggestionStatus,
  SuggestionType,
  ApplicationStatus,
  HistorySource,
  EmailClassification,
  Priority,
  WorkMode,
} from '@prisma/client';
import { statusService } from './statusService';
import { auditService } from './auditService';
import { applicationService } from './applicationService';
import { companyService } from './companyService';

type SuggestionOverrides = {
  company?: string; role?: string; status?: string; appliedAt?: string; jobUrl?: string; jobId?: string;
  location?: string; source?: string; workMode?: WorkMode; priority?: Priority; salary?: string;
  recruiterName?: string; recruiterEmail?: string; notes?: string; scheduleFollowUp?: boolean; customFollowUpDays?: number;
};

export const automationSuggestionService = {
  async processDetectedEmail(params: {
    userId: string;
    applicationId: string | null;
    classification: EmailClassification;
    confidence: number;
    reason: string;
    sender: string;
    subject: string;
    snippet: string;
    body?: string;
    detectedCompany?: string;
    detectedRole?: string;
  }) {
    const {
      userId,
      applicationId,
      classification,
      confidence,
      reason,
      sender,
      subject,
      snippet,
      body,
      detectedCompany,
      detectedRole,
    } = params;

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (userSettings && !userSettings.emailDetection) {
      return null;
    }

    // Determine target status from classification
    let targetStatus: ApplicationStatus | null = null;
    let suggestionType: SuggestionType = SuggestionType.STATUS_UPDATE;

    switch (classification) {
      case EmailClassification.APPLICATION_CONFIRMATION:
        targetStatus = ApplicationStatus.APPLIED;
        suggestionType = SuggestionType.STATUS_UPDATE;
        break;
      case EmailClassification.APPLICATION_VIEWED:
        targetStatus = ApplicationStatus.VIEWED;
        suggestionType = SuggestionType.STATUS_UPDATE;
        break;
      case EmailClassification.ASSESSMENT:
        targetStatus = ApplicationStatus.ASSESSMENT;
        suggestionType = SuggestionType.STATUS_UPDATE;
        break;
      case EmailClassification.INTERVIEW:
        targetStatus = ApplicationStatus.INTERVIEW;
        suggestionType = SuggestionType.INTERVIEW_DETECTED;
        break;
      case EmailClassification.OFFER:
        targetStatus = ApplicationStatus.OFFER;
        suggestionType = SuggestionType.STATUS_UPDATE;
        break;
      case EmailClassification.REJECTION:
        targetStatus = ApplicationStatus.REJECTED;
        suggestionType = SuggestionType.REJECTION_DETECTED;
        break;
      default:
        return null; // Irrelevant or recruiter general
    }

    // Check if auto-update is permissible based on user settings
    let shouldAutoApply = false;
    if (userSettings) {
      const isHighConfidence = confidence >= userSettings.confidenceThreshold;
      if (userSettings.highConfidenceAutoUpdate && isHighConfidence) {
        shouldAutoApply = true;
      }
      if (targetStatus === ApplicationStatus.INTERVIEW && userSettings.autoInterviewUpdates && isHighConfidence) {
        shouldAutoApply = true;
      }
      if (targetStatus === ApplicationStatus.REJECTED && userSettings.autoRejectionUpdates && isHighConfidence) {
        shouldAutoApply = true;
      }
    }

    // If we have an existing matched application and should auto-apply
    if (applicationId && shouldAutoApply && targetStatus) {
      await statusService.changeStatus({
        applicationId,
        userId,
        status: targetStatus,
        source: HistorySource.EMAIL,
        note: `Automatically updated: ${reason}`,
        metadata: {
          confidence,
          sender,
          subject,
          reason,
          autoApplied: true,
        },
      });

      await prisma.notification.create({
        data: {
          userId,
          applicationId,
          type: 'STATUS_UPDATE',
          title: `Status Updated to ${targetStatus}`,
          message: `Auto-updated from email: "${subject}". Reason: ${reason}`,
          link: `/applications/${applicationId}`,
        },
      });

      await auditService.log({
        userId,
        applicationId,
        eventType: 'AUTOMATION_ACCEPTED',
        payload: { autoApplied: true, targetStatus, confidence, subject },
      });

      return { status: 'AUTO_APPLIED', targetStatus };
    }

    // Otherwise create an explainable Suggestion for User Confirmation
    const suggestion = await prisma.automationSuggestion.create({
      data: {
        userId,
        applicationId: applicationId || null,
        type: suggestionType,
        confidence,
        status: SuggestionStatus.PENDING,
        payload: {
          detectedCompany: detectedCompany || 'Unknown Company',
          detectedRole: detectedRole || 'Position',
          targetStatus,
          sender,
          subject,
          snippet,
          body: body || null,
          reason,
          confidencePercent: Math.round(confidence * 100),
        },
      },
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        userId,
        applicationId: applicationId || null,
        type: 'EMAIL_DETECTED',
        title: `Suggested Update: ${targetStatus || 'New Event'}`,
        message: `${reason} (${detectedCompany || 'Application'}). Click to review suggestion.`,
        link: applicationId ? `/applications/${applicationId}` : `/automation`,
        metadata: { suggestionId: suggestion.id },
      },
    });

    return { status: 'SUGGESTION_CREATED', suggestion };
  },

  async acceptSuggestion(
    userId: string,
    suggestionId: string,
    targetApplicationId?: string,
    overrides?: SuggestionOverrides
  ) {
    const suggestion = await prisma.automationSuggestion.findFirst({
      where: { id: suggestionId, userId },
    });

    if (!suggestion) {
      const error: any = new Error('Suggestion not found');
      error.statusCode = 404;
      throw error;
    }

    const payload = suggestion.payload as any;
    let appId = targetApplicationId || suggestion.applicationId;
    let application: any = null;

    if (!appId) {
      // 1. Clean company name — use override if provided
      let company = overrides?.company?.trim() || (
        payload.detectedCompany && payload.detectedCompany !== 'Unknown Company' && payload.detectedCompany !== 'Mail'
          ? payload.detectedCompany
          : ''
      );

      if (!company) {
        const match = payload.subject?.match(/^([A-Za-z0-9\s&]+?)\s+application/i);
        company = match ? match[1].trim() : 'Company';
      }

      // 2. Clean role — use override if provided
      let jobTitle = overrides?.role?.trim() || (
        payload.detectedRole && payload.detectedRole !== 'Position'
          ? payload.detectedRole
          : ''
      );

      if (!jobTitle) {
        const bodyRoleMatch = payload.snippet?.match(/(?:position of|role of|applying for the|for the position of|for the role of|application for the)\s+([A-Za-z0-9\s&/-]+?)(?:\s*\(ID|\s+position|\s+role|\s+at Amazon|\s+at Google|\s+at|[!:,.-]|$)/i);
        jobTitle = bodyRoleMatch ? bodyRoleMatch[1].trim() : 'Software Engineer';
      }

      // 3. Status — use override if provided
      const targetStatus = (overrides?.status as ApplicationStatus) || payload.targetStatus || ApplicationStatus.APPLIED;

      application = await applicationService.createApplication({
        userId,
        company,
        jobTitle,
        currentStatus: targetStatus,
        appliedAt: overrides?.appliedAt || new Date(),
        jobUrl: overrides?.jobUrl || null,
        jobId: overrides?.jobId || null,
        location: overrides?.location || null,
        source: overrides?.source,
        workMode: overrides?.workMode,
        priority: overrides?.priority,
        salary: overrides?.salary || null,
        recruiterName: overrides?.recruiterName,
        recruiterEmail: overrides?.recruiterEmail || undefined,
        scheduleFollowUp: overrides?.scheduleFollowUp,
        customFollowUpDays: overrides?.customFollowUpDays,
        notes: overrides?.notes || `Created via email automation: "${payload.subject || ''}". ${payload.reason || ''}`,
        creationSource: HistorySource.EMAIL,
      });

      appId = application.id;

      // Update suggestion with newly created application ID
      await prisma.automationSuggestion.update({
        where: { id: suggestionId },
        data: { applicationId: appId },
      });

      // Update any associated notifications pointing to this suggestion
      await prisma.notification.updateMany({
        where: {
          userId,
          metadata: {
            path: ['suggestionId'],
            equals: suggestionId,
          },
        },
        data: {
          applicationId: appId,
          link: `/applications/${appId}`,
        },
      });
    } else if (appId) {
      const existing = await prisma.application.findFirst({
        where: { id: appId, userId },
        include: { company: true },
      });
      if (!existing) {
        const error: any = new Error('Application not found');
        error.statusCode = 404;
        throw error;
      }

      const companyName = overrides?.company?.trim();
      const company = companyName && companyName !== existing.company.name
        ? await companyService.findOrCreate(companyName)
        : existing.company;
      const updatedApplication = await prisma.application.update({
        where: { id: appId },
        data: {
          companyId: company.id,
          jobTitle: overrides?.role?.trim() || existing.jobTitle,
          appliedAt: overrides?.appliedAt ? new Date(overrides.appliedAt) : existing.appliedAt,
          jobUrl: overrides?.jobUrl || null,
          jobId: overrides?.jobId || null,
          location: overrides?.location || null,
          source: overrides?.source || existing.source,
          workMode: overrides?.workMode || existing.workMode,
          priority: overrides?.priority || existing.priority,
          salary: overrides?.salary || null,
          notes: overrides?.notes || existing.notes,
        },
        include: { company: true },
      });

      if (overrides?.recruiterName) {
        const existingContact = await prisma.contact.findFirst({ where: { applicationId: appId, userId } });
        const contactData = { name: overrides.recruiterName, email: overrides.recruiterEmail || null, companyId: company.id, role: 'Recruiter' };
        if (existingContact) await prisma.contact.update({ where: { id: existingContact.id }, data: contactData });
        else await prisma.contact.create({ data: { ...contactData, userId, applicationId: appId } });
      }

      application = updatedApplication;
      if (overrides?.status || payload.targetStatus) {
      const resolvedStatus = (overrides?.status as ApplicationStatus) || payload.targetStatus;
      await statusService.changeStatus({
        applicationId: appId,
        userId,
        status: resolvedStatus,
        source: HistorySource.EMAIL,
        note: `Accepted suggestion: ${payload.reason}`,
        metadata: {
          confidence: suggestion.confidence,
          sender: payload.sender,
          subject: payload.subject,
          reason: payload.reason,
          suggestionId: suggestion.id,
        },
      });

      }
    }

    const updated = await prisma.automationSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: SuggestionStatus.ACCEPTED,
        resolvedAt: new Date(),
        applicationId: appId,
      },
    });

    await auditService.log({
      userId,
      applicationId: appId,
      eventType: 'AUTOMATION_ACCEPTED',
      payload: { suggestionId, targetStatus: payload.targetStatus, applicationId: appId },
    });

    return { suggestion: updated, application, applicationId: appId };
  },

  async rejectSuggestion(userId: string, suggestionId: string) {
    const suggestion = await prisma.automationSuggestion.findFirst({
      where: { id: suggestionId, userId },
    });

    if (!suggestion) {
      const error: any = new Error('Suggestion not found');
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.automationSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: SuggestionStatus.REJECTED,
        resolvedAt: new Date(),
      },
    });

    await auditService.log({
      userId,
      applicationId: suggestion.applicationId,
      eventType: 'AUTOMATION_REJECTED',
      payload: { suggestionId },
    });

    return updated;
  },

  async listSuggestions(userId: string, status?: SuggestionStatus) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return await prisma.automationSuggestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        application: {
          include: { company: true },
        },
      },
    });
  },
};
