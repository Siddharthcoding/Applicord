import { prisma } from '../config/prisma';

export const generateApplicationPublicId = async (): Promise<string> => {
  const count = await prisma.application.count();
  const nextNum = count + 1;
  const padded = String(nextNum).padStart(6, '0');
  let candidate = `APP-${padded}`;
  
  // Ensure uniqueness
  let exists = await prisma.application.findUnique({
    where: { publicId: candidate },
    select: { id: true },
  });

  if (exists) {
    // If collision, generate random suffix
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    candidate = `APP-${padded}-${randomSuffix}`;
  }

  return candidate;
};
