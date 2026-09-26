import { Response, NextFunction } from 'express';
import { applicationService } from '../services/applicationService';
import { duplicateService } from '../services/duplicateService';
import {
  createApplicationSchema,
  updateApplicationSchema,
  duplicateCheckSchema,
  bulkActionSchema,
} from '../validators';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';
import { extractMetadataFromJobUrl } from '../utils/urlParser';

export const applicationController = {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = createApplicationSchema.parse(req.body);
      const app = await applicationService.createApplication({
        ...validated,
        userId,
      });
      return sendSuccess(res, app, 'Application tracked successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const {
        page,
        limit,
        search,
        status,
        source,
        workMode,
        priority,
        isArchived,
        sortBy,
        sortOrder,
      } = req.query;

      const result = await applicationService.listApplications({
        userId,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 25,
        search: search as string,
        status: status as any,
        source: source as string,
        workMode: workMode as any,
        priority: priority as any,
        isArchived: isArchived === 'true',
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      });

      return sendSuccess(res, result.applications, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id;
      const app = await applicationService.getApplicationById(userId, id);
      return sendSuccess(res, app);
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id;
      const validated = updateApplicationSchema.parse(req.body);
      const updated = await applicationService.updateApplication(userId, id, validated);
      return sendSuccess(res, updated, 'Application updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id;
      await applicationService.deleteApplication(userId, id);
      return sendSuccess(res, null, 'Application deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  async checkDuplicate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = duplicateCheckSchema.parse(req.body);
      const result = await duplicateService.checkDuplicate(userId, validated);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async parseUrl(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return sendSuccess(res, { source: 'OTHER' });
      }
      const extracted = extractMetadataFromJobUrl(url);
      return sendSuccess(res, extracted);
    } catch (err) {
      next(err);
    }
  },

  async bulkAction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = bulkActionSchema.parse(req.body);
      const result = await applicationService.handleBulkAction(
        userId,
        validated.applicationIds,
        validated.action,
        validated.payload
      );
      return sendSuccess(res, result, 'Bulk action executed successfully');
    } catch (err) {
      next(err);
    }
  },

  async getKanban(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const board = await applicationService.getKanbanBoard(userId);
      return sendSuccess(res, board);
    } catch (err) {
      next(err);
    }
  },
};
