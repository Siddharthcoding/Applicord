import { prisma } from '../config/prisma';
import { ReminderStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import { mailService } from '../services/mailService';

export const processDueReminders = async () => {
  logger.info('[Worker] Running scheduled reminder check...');
  const now = new Date();

  // 1. Mark overdue reminders
  const overdueReminders = await prisma.reminder.findMany({
    where: {
      status: ReminderStatus.PENDING,
      dueAt: { lt: now },
    },
    include: {
      user: {
        include: { settings: true },
      },
      application: {
        include: { company: true },
      },
    },
  });

  for (const reminder of overdueReminders) {
    // Check if notification already sent for this overdue reminder
    const existingNotif = await prisma.notification.findFirst({
      where: {
        userId: reminder.userId,
        applicationId: reminder.applicationId,
        type: 'REMINDER_OVERDUE',
        metadata: {
          path: ['reminderId'],
          equals: reminder.id,
        },
      },
    });

    if (!existingNotif) {
      const companyName = reminder.application ? reminder.application.company.name : '';
      const role = reminder.application ? `(${reminder.application.jobTitle})` : '';

      await prisma.notification.create({
        data: {
          userId: reminder.userId,
          applicationId: reminder.applicationId,
          type: 'REMINDER_OVERDUE',
          title: `Overdue Follow-up: ${reminder.title}`,
          message: `Follow-up for ${companyName} ${role} was due on ${reminder.dueAt.toLocaleDateString()}.`,
          link: reminder.applicationId ? `/applications/${reminder.applicationId}` : `/reminders`,
          metadata: { reminderId: reminder.id },
        },
      });

      // 3. Dispatch Email via Nodemailer (if user has email notifications enabled or not explicitly disabled)
      const shouldEmail = reminder.user.settings ? reminder.user.settings.emailNotifications : true;
      if (shouldEmail && reminder.user.email) {
        try {
          await mailService.sendReminderEmail({
            to: reminder.user.email,
            name: reminder.user.name,
            reminderTitle: reminder.title,
            dueAt: reminder.dueAt,
            companyName: companyName || undefined,
            jobTitle: reminder.application?.jobTitle || undefined,
            viewUrl: reminder.applicationId ? `/applications/${reminder.applicationId}` : `/calendar`,
            reminderType: reminder.type,
          });
        } catch (emailErr) {
          logger.error('[Worker] Failed to dispatch reminder email', emailErr, {
            reminderId: reminder.id,
            userEmail: reminder.user.email,
          });
        }
      }
    }
  }

  logger.info(`[Worker] Processed ${overdueReminders.length} overdue reminders.`);
};
