import { Response, NextFunction } from 'express';
import { documentService } from '../services/documentService';
import { createDocumentSchema } from '../validators';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';
import { DocumentCategory } from '@prisma/client';

export const documentController = {
  async upload(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const file = req.file;

      if (!file) {
        return sendError(res, 'No file uploaded', 400);
      }

      const validated = createDocumentSchema.parse(req.body);

      const document = await documentService.saveDocumentRecord(userId, {
        applicationId: validated.applicationId,
        name: validated.name || file.originalname,
        fileKey: file.filename,
        fileUrl: `/api/v1/documents/${file.filename}/file`,
        fileType: file.mimetype,
        fileSize: file.size,
        documentCategory: validated.documentCategory as DocumentCategory,
      });

      return sendSuccess(res, document, 'Document uploaded successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { applicationId } = req.query;
      const documents = await documentService.listDocuments(userId, applicationId as string);
      return sendSuccess(res, documents);
    } catch (err) {
      next(err);
    }
  },

  async download(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const documentId = req.params.id;
      const { document, filePath } = await documentService.getDocumentFile(userId, documentId);

      res.setHeader('Content-Type', document.fileType);
      res.setHeader('Content-Disposition', `inline; filename="${document.name}"`);
      return res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const documentId = req.params.id;
      await documentService.deleteDocument(userId, documentId);
      return sendSuccess(res, null, 'Document deleted');
    } catch (err) {
      next(err);
    }
  },
};
