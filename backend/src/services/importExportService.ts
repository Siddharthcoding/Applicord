import Papa from 'papaparse';
import { prisma } from '../config/prisma';
import { applicationService } from './applicationService';
import { ApplicationStatus, WorkMode } from '@prisma/client';
import { duplicateService } from './duplicateService';

export const importExportService = {
  parseCsvPreview(csvContent: string) {
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      throw new Error(`Failed to parse CSV: ${parsed.errors[0].message}`);
    }

    const headers = parsed.meta.fields || [];
    const sampleRows = parsed.data.slice(0, 5);
    const totalRows = parsed.data.length;

    // Suggest column mappings
    const suggestedMapping: Record<string, string> = {};
    headers.forEach(h => {
      const lower = h.toLowerCase().trim();
      if (lower.includes('company') || lower.includes('organization') || lower.includes('employer')) {
        suggestedMapping[h] = 'company';
      } else if (lower.includes('title') || lower.includes('role') || lower.includes('position')) {
        suggestedMapping[h] = 'jobTitle';
      } else if (lower.includes('applied') || lower.includes('date')) {
        suggestedMapping[h] = 'appliedAt';
      } else if (lower.includes('status')) {
        suggestedMapping[h] = 'status';
      } else if (lower.includes('source') || lower.includes('channel')) {
        suggestedMapping[h] = 'source';
      } else if (lower.includes('location') || lower.includes('city')) {
        suggestedMapping[h] = 'location';
      } else if (lower.includes('url') || lower.includes('link')) {
        suggestedMapping[h] = 'jobUrl';
      } else if (lower.includes('note') || lower.includes('comment')) {
        suggestedMapping[h] = 'notes';
      }
    });

    return {
      headers,
      sampleRows,
      totalRows,
      suggestedMapping,
      allRows: parsed.data,
    };
  },

  async previewImportWithDuplicates(userId: string, mappedRows: Array<{
    company: string;
    jobTitle: string;
    appliedAt?: string;
    status?: string;
    source?: string;
    location?: string;
    jobUrl?: string;
    notes?: string;
  }>) {
    const validatedRows = [];
    let duplicatesCount = 0;

    for (let i = 0; i < mappedRows.length; i++) {
      const row = mappedRows[i];
      if (!row.company || !row.jobTitle) {
        validatedRows.push({
          rowNumber: i + 1,
          data: row,
          isValid: false,
          error: 'Missing required company or jobTitle',
          isDuplicate: false,
        });
        continue;
      }

      const dupCheck = await duplicateService.checkDuplicate(userId, {
        company: row.company,
        jobTitle: row.jobTitle,
        jobUrl: row.jobUrl,
      });

      if (dupCheck.hasDuplicate) {
        duplicatesCount++;
      }

      validatedRows.push({
        rowNumber: i + 1,
        data: row,
        isValid: true,
        isDuplicate: dupCheck.hasDuplicate,
        duplicateInfo: dupCheck.existingApplication,
      });
    }

    return {
      totalRows: mappedRows.length,
      validRowsCount: validatedRows.filter(r => r.isValid).length,
      duplicatesCount,
      rows: validatedRows,
    };
  },

  async executeImport(userId: string, rows: Array<{
    company: string;
    jobTitle: string;
    appliedAt?: string;
    status?: string;
    source?: string;
    location?: string;
    jobUrl?: string;
    notes?: string;
  }>) {
    const results = [];
    let imported = 0;

    for (const row of rows) {
      if (!row.company || !row.jobTitle) continue;

      let validStatus: ApplicationStatus = ApplicationStatus.APPLIED;
      if (row.status) {
        const upper = row.status.toUpperCase().trim();
        if (['SAVED', 'APPLIED', 'VIEWED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'CLOSED'].includes(upper)) {
          validStatus = upper as ApplicationStatus;
        }
      }

      const app = await applicationService.createApplication({
        userId,
        company: row.company,
        jobTitle: row.jobTitle,
        appliedAt: row.appliedAt ? new Date(row.appliedAt) : new Date(),
        currentStatus: validStatus,
        source: row.source || 'IMPORT',
        location: row.location || null,
        jobUrl: row.jobUrl || null,
        notes: row.notes || null,
        creationSource: 'IMPORT',
        scheduleFollowUp: false,
      });

      results.push(app);
      imported++;
    }

    return {
      importedCount: imported,
      applications: results,
    };
  },

  async exportDataJson(userId: string) {
    const [user, applications, reminders, contacts, documents, auditLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, createdAt: true },
      }),
      prisma.application.findMany({
        where: { userId },
        include: {
          company: true,
          statusHistory: { orderBy: { timestamp: 'asc' } },
          contacts: true,
          reminders: true,
          documents: true,
        },
      }),
      prisma.reminder.findMany({ where: { userId } }),
      prisma.contact.findMany({ where: { userId } }),
      prisma.document.findMany({ where: { userId } }),
      prisma.auditLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    ]);

    return {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      user,
      applications,
      reminders,
      contacts,
      documents,
      auditLogs,
    };
  },

  async exportApplicationsCsv(userId: string) {
    const applications = await prisma.application.findMany({
      where: { userId },
      include: {
        company: true,
      },
      orderBy: { appliedAt: 'desc' },
    });

    const flat = applications.map(app => ({
      ID: app.publicId,
      Company: app.company.name,
      JobTitle: app.jobTitle,
      Status: app.currentStatus,
      AppliedDate: app.appliedAt.toISOString().split('T')[0],
      Source: app.source,
      WorkMode: app.workMode,
      EmploymentType: app.employmentType,
      Priority: app.priority,
      Location: app.location || '',
      JobURL: app.jobUrl || '',
      Salary: app.salary || '',
      Notes: app.notes || '',
      CreatedAt: app.createdAt.toISOString(),
      UpdatedAt: app.updatedAt.toISOString(),
    }));

    return Papa.unparse(flat);
  },
};
