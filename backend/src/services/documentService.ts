import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';
import { config } from '../config';
import { DocumentCategory } from '@prisma/client';
import { auditService } from './auditService';

export const documentService = {
  async saveDocumentRecord(userId: string, data: {
    applicationId: string;
    name: string;
    fileKey: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    documentCategory: DocumentCategory;
  }) {
    const document = await prisma.document.create({
      data: {
        userId,
        applicationId: data.applicationId,
        name: data.name,
        fileKey: data.fileKey,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        documentCategory: data.documentCategory || DocumentCategory.RESUME,
      },
      include: {
        application: {
          include: { company: true },
        },
      },
    });

    await auditService.log({
      userId,
      applicationId: data.applicationId,
      eventType: 'DOCUMENT_UPLOADED',
      payload: { documentId: document.id, name: document.name, category: document.documentCategory },
    });

    return document;
  },

  async deleteDocument(userId: string, documentId: string) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      const error: any = new Error('Document not found');
      error.statusCode = 404;
      throw error;
    }

    // Try deleting physical file
    try {
      const filePath = path.join(config.uploadDir, document.fileKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.error('Error deleting physical file', e);
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    await auditService.log({
      userId,
      applicationId: document.applicationId,
      eventType: 'DOCUMENT_DELETED',
      payload: { documentId, name: document.name },
    });

    return { success: true };
  },

  async getDocumentFile(userId: string, documentId: string) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      const error: any = new Error('Document not found');
      error.statusCode = 404;
      throw error;
    }

    const filePath = path.join(config.uploadDir, document.fileKey);
    if (!fs.existsSync(filePath)) {
      const error: any = new Error('Physical file missing on server');
      error.statusCode = 404;
      throw error;
    }

    return {
      document,
      filePath,
    };
  },

  async listDocuments(userId: string, applicationId?: string) {
    const where: any = { userId };
    if (applicationId) {
      where.applicationId = applicationId;
    }

    return await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        application: {
          include: { company: true },
        },
      },
    });
  },
};
