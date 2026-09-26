import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { googleOAuthService } from '../services/googleOAuthService';

export const processEmailSync = async () => {
  logger.info('[Worker] Running scheduled email sync check...');

  const activeIntegrations = await prisma.emailIntegration.findMany({
    where: {
      isEnabled: true,
      provider: 'GMAIL',
    },
  });

  logger.info(`[Worker] Found ${activeIntegrations.length} active Gmail integrations to sync.`);

  for (const integration of activeIntegrations) {
    try {
      logger.info(`[Worker] Syncing Gmail for integration ${integration.id} (${integration.providerAccountId})...`);
      const res = await googleOAuthService.syncGmailInbox(integration.id);
      logger.info(`[Worker] Synced ${res.syncedCount} new application emails for ${integration.providerAccountId}`);
    } catch (err) {
      logger.error(`[Worker] Failed syncing integration ${integration.id}:`, err);
    }
  }
};
