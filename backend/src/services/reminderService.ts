import { prisma } from '../config/prisma';
import { ReminderStatus, ReminderType, ApplicationStatus } from '@prisma/client';
import { auditService } from './auditService';

export const reminderService = {
  async scheduleAutoFollowUp(userId: string, applicationId: string, daysAhead: number = 7, customTitle?: string) {
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (userSettings && !userSettings.autoFollowUpReminders) {
      return null;
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { company: true },
    });

    if (!application) return null;

    // Do not schedule follow up for terminal statuses
    const terminalStatuses: ApplicationStatus[] = ['REJECTED', 'WITHDRAWN', 'ACCEPTED', 'CLOSED'];
    if (terminalStatuses.includes(application.currentStatus)) {
      return null;
    }

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + (daysAhead || userSettings?.followUpDays || 7));

    // Check if an existing pending follow-up already exists for this app
    const existing = await prisma.reminder.findFirst({
      where: {
        userId,
        applicationId,
        type: ReminderType.FOLLOW_UP,
        status: ReminderStatus.PENDING,
      },
    });

    if (existing) {
      // Update due date if needed
      return await prisma.reminder.update({
        where: { id: existing.id },
        data: {
          dueAt,
          title: customTitle || `Follow up on ${application.company.name} (${application.jobTitle})`,
        },
      });
    }

    const reminder = await prisma.reminder.create({
      data: {
        userId,
        applicationId,
        type: ReminderType.FOLLOW_UP,
        title: customTitle || `Follow up with ${application.company.name} for ${application.jobTitle}`,
        description: `Automated follow-up suggested ${daysAhead} days after activity.`,
        dueAt,
        status: ReminderStatus.PENDING,
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        applicationId,
        type: 'REMINDER',
        title: 'Follow-up Scheduled',
        message: `Follow-up reminder set for ${application.company.name} on ${dueAt.toLocaleDateString()}`,
        link: `/applications/${application.id}`,
      },
    });

    await auditService.log({
      userId,
      applicationId,
      eventType: 'REMINDER_CREATED',
      payload: { reminderId: reminder.id, dueAt },
    });

    return reminder;
  },

  async createReminder(userId: string, data: {
    applicationId?: string | null;
    type?: ReminderType;
    title: string;
    description?: string | null;
    dueAt: string | Date;
  }) {
    const reminder = await prisma.reminder.create({
      data: {
        userId,
        applicationId: data.applicationId || null,
        type: data.type || ReminderType.FOLLOW_UP,
        title: data.title,
        description: data.description || null,
        dueAt: new Date(data.dueAt),
        status: ReminderStatus.PENDING,
      },
      include: {
        application: {
          include: {
            company: true,
          },
        },
      },
    });

    await auditService.log({
      userId,
      applicationId: data.applicationId || null,
      eventType: 'REMINDER_CREATED',
      payload: { reminderId: reminder.id, title: reminder.title, dueAt: reminder.dueAt },
    });

    return reminder;
  },

  async updateReminder(userId: string, reminderId: string, data: any) {
    const updateData: any = { ...data };
    if (data.dueAt) {
      updateData.dueAt = new Date(data.dueAt);
    }
    if (data.status === ReminderStatus.COMPLETED && !data.completedAt) {
      updateData.completedAt = new Date();
    } else if (data.status === ReminderStatus.PENDING) {
      updateData.completedAt = null;
    }

    const updated = await prisma.reminder.update({
      where: { id: reminderId },
      data: updateData,
      include: {
        application: {
          include: { company: true },
        },
      },
    });

    if (data.status === ReminderStatus.COMPLETED) {
      await auditService.log({
        userId,
        applicationId: updated.applicationId,
        eventType: 'REMINDER_COMPLETED',
        payload: { reminderId },
      });
    }

    return updated;
  },

  async deleteReminder(userId: string, reminderId: string) {
    await prisma.reminder.delete({
      where: { id: reminderId },
    });
    return { success: true };
  },

  async listReminders(userId: string, filters: {
    status?: ReminderStatus;
    applicationId?: string;
    upcomingOnly?: boolean;
  } = {}) {
    const where: any = { userId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.applicationId) {
      where.applicationId = filters.applicationId;
    }

    if (filters.upcomingOnly) {
      where.status = ReminderStatus.PENDING;
    }

    return await prisma.reminder.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      include: {
        application: {
          include: { company: true },
        },
      },
    });
  },

  async getCalendarEvents(userId: string, startDate: Date, endDate: Date) {
    const reminders = await prisma.reminder.findMany({
      where: {
        userId,
        dueAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        application: {
          include: { company: true },
        },
      },
      orderBy: { dueAt: 'asc' },
    });

    const statusEvents = await prisma.applicationStatusHistory.findMany({
      where: {
        application: { userId },
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        application: {
          include: { company: true },
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    return {
      reminders,
      statusEvents,
    };
  },
};
