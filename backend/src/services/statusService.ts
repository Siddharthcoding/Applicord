import { prisma } from '../config/prisma';
import { ApplicationStatus, HistorySource, ReminderStatus } from '@prisma/client';
import { auditService } from './auditService';
import { reminderService } from './reminderService';

export interface ChangeStatusParams {
  applicationId: string;
  userId: string;
  status: ApplicationStatus;
  source?: HistorySource;
  timestamp?: string | Date;
  note?: string | null;
  metadata?: Record<string, any>;
  scheduleFollowUp?: boolean;
}

export const statusService = {
  async changeStatus(params: ChangeStatusParams) {
    const {
      applicationId,
      userId,
      status,
      source = HistorySource.MANUAL,
      timestamp = new Date(),
      note,
      metadata = {},
      scheduleFollowUp = true,
    } = params;

    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: { company: true },
    });

    if (!application) {
      const error: any = new Error('Application not found');
      error.statusCode = 404;
      throw error;
    }

    const previousStatus = application.currentStatus;

    // Check if the application is already in this status and latest history entry matches
    if (previousStatus === status) {
      const latestHistory = await prisma.applicationStatusHistory.findFirst({
        where: { applicationId },
        orderBy: { timestamp: 'desc' },
      });

      if (latestHistory && latestHistory.status === status) {
        // If an extra note or metadata was provided, update the existing entry rather than duplicating
        if (note && (!latestHistory.note || latestHistory.note.startsWith('Application submitted'))) {
          await prisma.applicationStatusHistory.update({
            where: { id: latestHistory.id },
            data: {
              note,
              metadata: {
                ...(latestHistory.metadata as any || {}),
                ...metadata,
              },
            },
          });
        }

        return {
          application,
          historyEntry: latestHistory,
          isDuplicate: true,
        };
      }
    }

    // 1. Update Application Current Status
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        currentStatus: status,
        updatedAt: new Date(),
      },
      include: { company: true },
    });

    // 2. Append to Status History (Immutable Event)
    const historyEntry = await prisma.applicationStatusHistory.create({
      data: {
        applicationId,
        status,
        timestamp: new Date(timestamp),
        source,
        note: note || null,
        metadata: {
          ...metadata,
          previousStatus,
          updatedAt: new Date().toISOString(),
        },
        createdByUserId: userId,
      },
    });

    // 3. Log Audit Trail
    await auditService.log({
      userId,
      applicationId,
      eventType: 'STATUS_CHANGED',
      payload: {
        from: previousStatus,
        to: status,
        source,
        historyId: historyEntry.id,
        note,
      },
    });

    // 4. Handle Reminders based on new status
    const terminalStatuses: ApplicationStatus[] = ['REJECTED', 'WITHDRAWN', 'ACCEPTED', 'CLOSED'];
    if (terminalStatuses.includes(status)) {
      // Dismiss pending follow-ups for terminal statuses
      await prisma.reminder.updateMany({
        where: {
          applicationId,
          userId,
          status: ReminderStatus.PENDING,
        },
        data: {
          status: ReminderStatus.DISMISSED,
        },
      });
    } else if (scheduleFollowUp && (status === 'APPLIED' || status === 'INTERVIEW' || status === 'ASSESSMENT')) {
      // Schedule follow-up depending on stage
      const days = status === 'INTERVIEW' ? 3 : 7;
      await reminderService.scheduleAutoFollowUp(userId, applicationId, days);
    }

    return {
      application: updatedApplication,
      historyEntry,
    };
  },

  async correctStatus(userId: string, data: {
    statusHistoryId: string;
    correctStatus: ApplicationStatus;
    reason: string;
  }) {
    const historyEntry = await prisma.applicationStatusHistory.findUnique({
      where: { id: data.statusHistoryId },
      include: { application: true },
    });

    if (!historyEntry || historyEntry.application.userId !== userId) {
      const error: any = new Error('Status history record not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    const applicationId = historyEntry.applicationId;
    const oldStatus = historyEntry.status;

    // We do NOT destroy history: We mark the history entry with correction metadata
    // AND record a new correction event
    await prisma.applicationStatusHistory.update({
      where: { id: data.statusHistoryId },
      data: {
        note: `[Corrected by user: ${data.reason}] ${historyEntry.note || ''}`,
        metadata: {
          ...((historyEntry.metadata as object) || {}),
          isCorrected: true,
          correctionReason: data.reason,
          correctedTo: data.correctStatus,
          correctedAt: new Date().toISOString(),
        },
      },
    });

    // Create Correction event
    const correctionEvent = await prisma.applicationStatusHistory.create({
      data: {
        applicationId,
        status: data.correctStatus,
        source: HistorySource.MANUAL,
        note: `Manual correction: ${data.reason} (Replaced ${oldStatus})`,
        metadata: {
          isCorrectionEvent: true,
          originalEventId: historyEntry.id,
          correctedFrom: oldStatus,
          reason: data.reason,
        },
        createdByUserId: userId,
      },
    });

    // Update the application current status to the corrected status
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: { currentStatus: data.correctStatus },
      include: { company: true },
    });

    await auditService.log({
      userId,
      applicationId,
      eventType: 'STATUS_CORRECTED',
      payload: {
        originalEventId: historyEntry.id,
        from: oldStatus,
        to: data.correctStatus,
        reason: data.reason,
      },
    });

    return {
      application: updatedApplication,
      correctionEvent,
    };
  },

  async getTimeline(applicationId: string, userId: string) {
    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId },
      select: { id: true },
    });

    if (!application) {
      const error: any = new Error('Application not found');
      error.statusCode = 404;
      throw error;
    }

    return await prisma.applicationStatusHistory.findMany({
      where: { applicationId },
      orderBy: { timestamp: 'asc' },
    });
  },
};
