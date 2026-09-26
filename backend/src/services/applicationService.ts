import { prisma } from '../config/prisma';
import { ApplicationStatus, HistorySource, Priority, WorkMode, EmploymentType } from '@prisma/client';
import { generateApplicationPublicId } from '../utils/idGenerator';
import { companyService } from './companyService';
import { statusService } from './statusService';
import { reminderService } from './reminderService';
import { auditService } from './auditService';
import { extractMetadataFromJobUrl } from '../utils/urlParser';

export interface CreateApplicationInput {
  userId: string;
  company: string;
  jobTitle: string;
  appliedAt?: string | Date;
  currentStatus?: ApplicationStatus;
  jobId?: string | null;
  jobUrl?: string | null;
  location?: string | null;
  workMode?: WorkMode;
  employmentType?: EmploymentType;
  source?: string;
  priority?: Priority;
  salary?: string | null;
  notes?: string | null;
  scheduleFollowUp?: boolean;
  customFollowUpDays?: number;
  recruiterName?: string;
  recruiterEmail?: string;
  creationSource?: HistorySource;
}

export interface ListApplicationsParams {
  userId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: ApplicationStatus | ApplicationStatus[];
  source?: string;
  workMode?: WorkMode;
  priority?: Priority;
  isArchived?: boolean;
  sortBy?: 'appliedAt' | 'updatedAt' | 'company' | 'priority' | 'jobTitle';
  sortOrder?: 'asc' | 'desc';
}

export const applicationService = {
  async createApplication(input: CreateApplicationInput) {
    const {
      userId,
      company: companyName,
      jobTitle,
      appliedAt = new Date(),
      currentStatus = ApplicationStatus.APPLIED,
      jobId,
      jobUrl,
      location,
      workMode = WorkMode.HYBRID,
      employmentType = EmploymentType.FULL_TIME,
      source: inputSource,
      priority = Priority.MEDIUM,
      salary,
      notes,
      scheduleFollowUp = true,
      customFollowUpDays = 7,
      recruiterName,
      recruiterEmail,
      creationSource = HistorySource.MANUAL,
    } = input;

    // 1. If Job URL is provided, enrich with URL intelligence if field not explicitly given
    let derivedSource = inputSource || 'LINKEDIN';
    let derivedJobId = jobId;
    if (jobUrl) {
      const extracted = extractMetadataFromJobUrl(jobUrl);
      if (!inputSource && extracted.source) {
        derivedSource = extracted.source;
      }
      if (!jobId && extracted.jobId) {
        derivedJobId = extracted.jobId;
      }
    }

    // 2. Find or Create Company (Reuses existing company)
    const company = await companyService.findOrCreate(companyName);

    // 3. Generate Human-Friendly Public ID (e.g. APP-000001)
    const publicId = await generateApplicationPublicId();

    // 4. Create Application
    const application = await prisma.application.create({
      data: {
        publicId,
        userId,
        companyId: company.id,
        jobTitle: jobTitle.trim(),
        jobId: derivedJobId || null,
        jobUrl: jobUrl || null,
        location: location || null,
        workMode,
        employmentType,
        source: derivedSource,
        appliedAt: new Date(appliedAt),
        currentStatus,
        priority,
        salary: salary || null,
        notes: notes || null,
        isArchived: false,
      },
      include: {
        company: true,
      },
    });

    // 5. Append Initial Status Event in History
    await prisma.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        status: currentStatus,
        timestamp: new Date(appliedAt),
        source: creationSource,
        note: currentStatus === ApplicationStatus.SAVED ? 'Job saved for later' : 'Application submitted',
        metadata: {
          initialCreation: true,
          creationSource,
        },
        createdByUserId: userId,
      },
    });

    // 6. Handle Recruiter contact if provided
    if (recruiterName) {
      await prisma.contact.create({
        data: {
          userId,
          applicationId: application.id,
          companyId: company.id,
          name: recruiterName,
          email: recruiterEmail || null,
          role: 'Recruiter',
        },
      });
    }

    // 7. Schedule follow-up reminder if enabled
    if (scheduleFollowUp && currentStatus !== ApplicationStatus.SAVED) {
      await reminderService.scheduleAutoFollowUp(userId, application.id, customFollowUpDays);
    }

    // 8. Log Audit Event
    await auditService.log({
      userId,
      applicationId: application.id,
      eventType: 'APPLICATION_CREATED',
      payload: {
        publicId,
        company: company.name,
        jobTitle,
        status: currentStatus,
      },
    });

    return application;
  },

  async listApplications(params: ListApplicationsParams) {
    const {
      userId,
      page = 1,
      limit = 25,
      search,
      status,
      source,
      workMode,
      priority,
      isArchived = false,
      sortBy = 'appliedAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;
    const where: any = {
      userId,
      isArchived,
    };

    // Filter by status
    if (status) {
      if (Array.isArray(status)) {
        where.currentStatus = { in: status };
      } else {
        where.currentStatus = status;
      }
    }

    // Filter by source
    if (source && source !== 'ALL') {
      where.source = source;
    }

    // Filter by workMode
    if (workMode) {
      where.workMode = workMode;
    }

    // Filter by priority
    if (priority) {
      where.priority = priority;
    }

    // Search query
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { jobTitle: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { jobId: { contains: q, mode: 'insensitive' } },
        { publicId: { contains: q, mode: 'insensitive' } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    // Sorting
    let orderBy: any = {};
    if (sortBy === 'company') {
      orderBy = { company: { name: sortOrder } };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          company: true,
          reminders: {
            where: { status: 'PENDING' },
            orderBy: { dueAt: 'asc' },
            take: 1,
          },
          statusHistory: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              statusHistory: true,
              contacts: true,
              documents: true,
              reminders: true,
            },
          },
        },
      }),
      prisma.application.count({ where }),
    ]);

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getApplicationById(userId: string, id: string) {
    const application = await prisma.application.findFirst({
      where: { id, userId },
      include: {
        company: true,
        statusHistory: {
          orderBy: { timestamp: 'asc' },
        },
        reminders: {
          orderBy: { dueAt: 'asc' },
        },
        contacts: {
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        suggestions: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
        },
        tags: {
          include: { tag: true },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!application) {
      const error: any = new Error('Application not found');
      error.statusCode = 404;
      throw error;
    }

    return application;
  },

  async updateApplication(userId: string, id: string, data: any) {
    const existing = await prisma.application.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      const error: any = new Error('Application not found');
      error.statusCode = 404;
      throw error;
    }

    let companyId = existing.companyId;
    if (data.company) {
      const company = await companyService.findOrCreate(data.company);
      companyId = company.id;
    }

    const updatePayload: any = {};
    if (data.jobTitle) updatePayload.jobTitle = data.jobTitle;
    if (data.jobId !== undefined) updatePayload.jobId = data.jobId;
    if (data.jobUrl !== undefined) updatePayload.jobUrl = data.jobUrl;
    if (data.location !== undefined) updatePayload.location = data.location;
    if (data.workMode) updatePayload.workMode = data.workMode;
    if (data.employmentType) updatePayload.employmentType = data.employmentType;
    if (data.source) updatePayload.source = data.source;
    if (data.priority) updatePayload.priority = data.priority;
    if (data.salary !== undefined) updatePayload.salary = data.salary;
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.isArchived !== undefined) updatePayload.isArchived = data.isArchived;
    if (data.appliedAt) updatePayload.appliedAt = new Date(data.appliedAt);
    updatePayload.companyId = companyId;

    const updated = await prisma.application.update({
      where: { id },
      data: updatePayload,
      include: { company: true },
    });

    // If status change was provided in update, run via statusService
    if (data.currentStatus && data.currentStatus !== existing.currentStatus) {
      await statusService.changeStatus({
        applicationId: id,
        userId,
        status: data.currentStatus,
        source: HistorySource.MANUAL,
        note: 'Updated via application edit form',
      });
    }

    await auditService.log({
      userId,
      applicationId: id,
      eventType: 'APPLICATION_UPDATED',
      payload: data,
    });

    return updated;
  },

  async deleteApplication(userId: string, id: string) {
    const existing = await prisma.application.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      const error: any = new Error('Application not found');
      error.statusCode = 404;
      throw error;
    }

    await prisma.application.delete({
      where: { id },
    });

    await auditService.log({
      userId,
      eventType: 'APPLICATION_DELETED',
      payload: { id, publicId: existing.publicId, jobTitle: existing.jobTitle },
    });

    return { success: true };
  },

  async handleBulkAction(userId: string, applicationIds: string[], action: string, payload?: any) {
    // Verify ownership of all IDs
    const apps = await prisma.application.findMany({
      where: {
        id: { in: applicationIds },
        userId,
      },
      select: { id: true, currentStatus: true },
    });

    if (apps.length === 0) {
      const error: any = new Error('No valid applications found');
      error.statusCode = 400;
      throw error;
    }

    const validIds = apps.map(a => a.id);

    switch (action) {
      case 'CHANGE_STATUS': {
        const newStatus = payload?.status as ApplicationStatus;
        if (!newStatus) throw new Error('Status required for bulk change');
        
        for (const appId of validIds) {
          await statusService.changeStatus({
            applicationId: appId,
            userId,
            status: newStatus,
            source: HistorySource.MANUAL,
            note: 'Bulk status update',
          });
        }
        return { updatedCount: validIds.length, action: 'CHANGE_STATUS' };
      }

      case 'ARCHIVE': {
        const result = await prisma.application.updateMany({
          where: { id: { in: validIds }, userId },
          data: { isArchived: true },
        });
        return { updatedCount: result.count, action: 'ARCHIVE' };
      }

      case 'UNARCHIVE': {
        const result = await prisma.application.updateMany({
          where: { id: { in: validIds }, userId },
          data: { isArchived: false },
        });
        return { updatedCount: result.count, action: 'UNARCHIVE' };
      }

      case 'SET_PRIORITY': {
        const priority = payload?.priority as Priority;
        const result = await prisma.application.updateMany({
          where: { id: { in: validIds }, userId },
          data: { priority },
        });
        return { updatedCount: result.count, action: 'SET_PRIORITY' };
      }

      case 'DELETE': {
        const result = await prisma.application.deleteMany({
          where: { id: { in: validIds }, userId },
        });
        return { deletedCount: result.count, action: 'DELETE' };
      }

      default:
        throw new Error('Unsupported bulk action');
    }
  },

  async getKanbanBoard(userId: string) {
    const applications = await prisma.application.findMany({
      where: {
        userId,
        isArchived: false,
      },
      include: {
        company: true,
        reminders: {
          where: { status: 'PENDING' },
          orderBy: { dueAt: 'asc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const columns: Record<ApplicationStatus, typeof applications> = {
      SAVED: [],
      APPLIED: [],
      VIEWED: [],
      ASSESSMENT: [],
      INTERVIEW: [],
      OFFER: [],
      ACCEPTED: [],
      REJECTED: [],
      WITHDRAWN: [],
      CLOSED: [],
    };

    applications.forEach(app => {
      if (columns[app.currentStatus]) {
        columns[app.currentStatus].push(app);
      }
    });

    return columns;
  },
};
