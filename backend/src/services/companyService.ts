import { prisma } from '../config/prisma';

export const companyService = {
  async findOrCreate(name: string, website?: string | null, logoUrl?: string | null) {
    const trimmedName = name.trim();
    
    // Check by name case-insensitive
    const existing = await prisma.company.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      if ((website && !existing.website) || (logoUrl && !existing.logoUrl)) {
        return await prisma.company.update({
          where: { id: existing.id },
          data: {
            website: website || existing.website,
            logoUrl: logoUrl || existing.logoUrl,
          },
        });
      }
      return existing;
    }

    return await prisma.company.create({
      data: {
        name: trimmedName,
        website: website || null,
        logoUrl: logoUrl || null,
      },
    });
  },

  async search(query: string) {
    return await prisma.company.findMany({
      where: {
        name: {
          contains: query.trim(),
          mode: 'insensitive',
        },
      },
      take: 10,
      orderBy: { name: 'asc' },
    });
  },

  async getAll() {
    return await prisma.company.findMany({
      orderBy: { name: 'asc' },
    });
  },
};
