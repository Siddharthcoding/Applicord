import { Response, NextFunction } from 'express';
import { extensionService } from '../services/extensionService';
import { extensionDetectSchema, extensionTrackSchema } from '../validators';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export const extensionController = {
  async detect(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = extensionDetectSchema.parse(req.body);
      const result = await extensionService.detectPageJob(userId, validated);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async track(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = extensionTrackSchema.parse(req.body);
      const app = await extensionService.trackFromExtension(userId, validated);
      return sendSuccess(res, app, 'Application tracked from extension', 201);
    } catch (err) {
      next(err);
    }
  },
};
