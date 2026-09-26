import { Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export const analyticsController = {
  async getDashboardSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const data = await analyticsService.getDashboardSummary(userId);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getDetailedAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const data = await analyticsService.getDetailedAnalytics(userId);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },
};
