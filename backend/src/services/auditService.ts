import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

export interface AuditLogData {
  userId: string;
  applicationId?: string | null;
  eventType: string;
  payload?: any;
  ipAddress?: string;
  userAgent?: string;
}

export const auditService = {
  async log(data: AuditLogData) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: data.userId,
          applicationId: data.applicationId || null,
          eventType: data.eventType,
          payload: data.payload || {},
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (err) {
      logger.error('Failed to create audit log', err, { eventType: data.eventType });
      return null;
    }
  },

  async getLogs(userId: string, filters: { applicationId?: string; limit?: number; page?: number } = {}) {
    const limit = filters.limit || 50;
    const page = filters.page || 1;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (filters.applicationId) {
      where.applicationId = filters.applicationId;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
