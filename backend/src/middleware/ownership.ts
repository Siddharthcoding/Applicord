import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { prisma } from '../config/prisma';
import { sendError } from '../utils/response';

export const checkApplicationOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.userId;
  const applicationId = req.params.id || req.params.applicationId;

  if (!userId) {
    return sendError(res, 'Unauthorized', 401);
  }

  if (!applicationId) {
    return sendError(res, 'Application ID missing', 400);
  }

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      userId,
    },
    select: { id: true },
  });

  if (!application) {
    return sendError(res, 'Application not found or access denied', 404);
  }

  return next();
};

export const checkReminderOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.userId;
  const reminderId = req.params.id || req.params.reminderId;

  if (!userId || !reminderId) {
    return sendError(res, 'Invalid request', 400);
  }

  const reminder = await prisma.reminder.findFirst({
    where: {
      id: reminderId,
      userId,
    },
    select: { id: true },
  });

  if (!reminder) {
    return sendError(res, 'Reminder not found or access denied', 404);
  }

  return next();
};

export const checkContactOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.userId;
  const contactId = req.params.id || req.params.contactId;

  if (!userId || !contactId) {
    return sendError(res, 'Invalid request', 400);
  }

  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      userId,
    },
    select: { id: true },
  });

  if (!contact) {
    return sendError(res, 'Contact not found or access denied', 404);
  }

  return next();
};

export const checkDocumentOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.userId;
  const documentId = req.params.id || req.params.documentId;

  if (!userId || !documentId) {
    return sendError(res, 'Invalid request', 400);
  }

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId,
    },
    select: { id: true },
  });

  if (!document) {
    return sendError(res, 'Document not found or access denied', 404);
  }

  return next();
};
