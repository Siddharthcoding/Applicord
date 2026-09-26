import { Response, NextFunction } from 'express';
import { reminderService } from '../services/reminderService';
import { createReminderSchema, updateReminderSchema } from '../validators';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export const reminderController = {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = createReminderSchema.parse(req.body);
      const reminder = await reminderService.createReminder(userId, validated);
      return sendSuccess(res, reminder, 'Reminder created', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { status, applicationId, upcomingOnly } = req.query;

      const reminders = await reminderService.listReminders(userId, {
        status: status as any,
        applicationId: applicationId as string,
        upcomingOnly: upcomingOnly === 'true',
      });

      return sendSuccess(res, reminders);
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id;
      const validated = updateReminderSchema.parse(req.body);
      const updated = await reminderService.updateReminder(userId, id, validated);
      return sendSuccess(res, updated, 'Reminder updated');
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id;
      await reminderService.deleteReminder(userId, id);
      return sendSuccess(res, null, 'Reminder deleted');
    } catch (err) {
      next(err);
    }
  },

  async getCalendar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { start, end } = req.query;

      const startDate = start ? new Date(start as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = end ? new Date(end as string) : new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);

      const data = await reminderService.getCalendarEvents(userId, startDate, endDate);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },
};
