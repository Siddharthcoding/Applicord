import { Response, NextFunction } from 'express';
import { auditService } from '../services/auditService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export const auditController = {
  async getLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { applicationId, page, limit } = req.query;

      const result = await auditService.getLogs(userId, {
        applicationId: applicationId as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });

      return sendSuccess(res, result.logs, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  },
};
