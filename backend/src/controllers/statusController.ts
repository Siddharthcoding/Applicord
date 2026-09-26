import { Response, NextFunction } from 'express';
import { statusService } from '../services/statusService';
import { changeStatusSchema, correctStatusSchema } from '../validators';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export const statusController = {
  async changeStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const applicationId = req.params.id;
      const validated = changeStatusSchema.parse(req.body);

      const result = await statusService.changeStatus({
        applicationId,
        userId,
        status: validated.status,
        source: validated.source,
        timestamp: validated.timestamp,
        note: validated.note,
        metadata: validated.metadata,
        scheduleFollowUp: validated.scheduleFollowUp,
      });

      return sendSuccess(res, result, `Status updated to ${validated.status}`);
    } catch (err) {
      next(err);
    }
  },

  async correctStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = correctStatusSchema.parse(req.body);

      const result = await statusService.correctStatus(userId, validated);
      return sendSuccess(res, result, 'Status corrected and audit recorded');
    } catch (err) {
      next(err);
    }
  },

  async getTimeline(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const applicationId = req.params.id;
      const timeline = await statusService.getTimeline(applicationId, userId);
      return sendSuccess(res, timeline);
    } catch (err) {
      next(err);
    }
  },
};
