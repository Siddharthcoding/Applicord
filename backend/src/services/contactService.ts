import { prisma } from '../config/prisma';
import { auditService } from './auditService';
import { companyService } from './companyService';

export const contactService = {
  async createContact(userId: string, data: {
    applicationId?: string | null;
    companyId?: string | null;
    companyName?: string;
    name: string;
    role?: string | null;
    email?: string | null;
    phone?: string | null;
    linkedIn?: string | null;
    notes?: string | null;
    lastContactDate?: string | Date | null;
  }) {
    let companyId = data.companyId;

    if (!companyId && data.companyName) {
      const company = await companyService.findOrCreate(data.companyName);
      companyId = company.id;
    } else if (!companyId && data.applicationId) {
      const app = await prisma.application.findUnique({
        where: { id: data.applicationId },
        select: { companyId: true },
      });
      if (app) {
        companyId = app.companyId;
      }
    }

    const contact = await prisma.contact.create({
      data: {
        userId,
        applicationId: data.applicationId || null,
        companyId: companyId || null,
        name: data.name,
        role: data.role || null,
        email: data.email || null,
        phone: data.phone || null,
        linkedIn: data.linkedIn || null,
        notes: data.notes || null,
        lastContactDate: data.lastContactDate ? new Date(data.lastContactDate) : null,
      },
      include: {
        company: true,
        application: {
          include: { company: true },
        },
      },
    });

    await auditService.log({
      userId,
      applicationId: data.applicationId || null,
      eventType: 'CONTACT_ADDED',
      payload: { contactId: contact.id, name: contact.name, role: contact.role },
    });

    return contact;
  },

  async updateContact(userId: string, contactId: string, data: any) {
    const updateData: any = { ...data };
    if (data.lastContactDate) {
      updateData.lastContactDate = new Date(data.lastContactDate);
    }

    return await prisma.contact.update({
      where: { id: contactId },
      data: updateData,
      include: {
        company: true,
        application: {
          include: { company: true },
        },
      },
    });
  },

  async deleteContact(userId: string, contactId: string) {
    await prisma.contact.delete({
      where: { id: contactId },
    });
    return { success: true };
  },

  async listContacts(userId: string, filters: { applicationId?: string; companyId?: string; search?: string } = {}) {
    const where: any = { userId };

    if (filters.applicationId) {
      where.applicationId = filters.applicationId;
    }

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { role: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        company: true,
        application: {
          include: { company: true },
        },
      },
    });
  },
};
