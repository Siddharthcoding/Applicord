import { Response, NextFunction } from 'express';
import { importExportService } from '../services/importExportService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export const importExportController = {
  async parseCsv(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        return sendError(res, 'CSV file is required', 400);
      }

      const csvContent = file.buffer.toString('utf8');
      const preview = importExportService.parseCsvPreview(csvContent);
      return sendSuccess(res, preview);
    } catch (err) {
      next(err);
    }
  },

  async previewImport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { rows } = req.body;
      if (!Array.isArray(rows)) {
        return sendError(res, 'Rows array required', 400);
      }

      const result = await importExportService.previewImportWithDuplicates(userId, rows);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async executeImport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return sendError(res, 'Rows array required', 400);
      }

      const result = await importExportService.executeImport(userId, rows);
      return sendSuccess(res, result, `Successfully imported ${result.importedCount} applications`, 201);
    } catch (err) {
      next(err);
    }
  },

  async exportJson(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const data = await importExportService.exportDataJson(userId);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="applicord-export-${new Date().toISOString().split('T')[0]}.json"`);
      return res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async exportCsv(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const csvString = await importExportService.exportApplicationsCsv(userId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="applicord-applications-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvString);
    } catch (err) {
      next(err);
    }
  },
};
