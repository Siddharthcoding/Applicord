import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export const notificationController = {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      const unreadCount = await prisma.notification.count({
        where: { userId, readAt: null },
      });

      return sendSuccess(res, { notifications, unreadCount });
    } catch (err) {
      next(err);
    }
  },

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id;

      if (id === 'all') {
        await prisma.notification.updateMany({
          where: { userId, readAt: null },
          data: { readAt: new Date() },
        });
        return sendSuccess(res, null, 'All notifications marked as read');
      }

      const notif = await prisma.notification.findFirst({
        where: { id, userId },
      });

      if (!notif) {
        return sendError(res, 'Notification not found', 404);
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { readAt: new Date() },
      });

      return sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },
};
