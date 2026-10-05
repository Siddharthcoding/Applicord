import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.PRISMA_LOG_QUERIES === 'true' ? ['query', 'error', 'warn'] : ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

// Retry $connect() for Neon's auto-suspend cold-start (P1001 errors)
async function connectWithRetry(client: PrismaClient, retries = 5, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await client.$connect();
      return;
    } catch (err: any) {
      const isConnectError = err?.code === 'P1001' || err?.message?.includes("Can't reach database");
      if (isConnectError && attempt < retries) {
        console.warn(`[Prisma] DB unreachable (Neon cold start?), retrying in ${delayMs}ms... (${attempt}/${retries})`);
        await new Promise((res) => setTimeout(res, delayMs));
        delayMs = Math.min(delayMs * 2, 15000); // exponential backoff, cap at 15s
      } else {
        throw err;
      }
    }
  }
}

const prismaClient = global.prisma ?? createPrismaClient();

// Kick off connection eagerly so the first request doesn't cold-start
connectWithRetry(prismaClient).catch((err) => {
  console.error('[Prisma] Failed to connect to database after retries:', err.message);
});

export const prisma = prismaClient;

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prismaClient;
}
