import { prisma } from '../config/prisma';
import { emailClassificationService } from './emailClassificationService';
import { emailMatchingService } from './emailMatchingService';
import { automationSuggestionService } from './automationSuggestionService';
import { aiEntityExtractorService } from './aiEntityExtractorService';
import { encrypt } from '../utils/encryption';
import { logger } from '../utils/logger';

export interface EmailMessagePayload {
  messageId: string;
  sender: string;
  subject: string;
  snippet: string;
  body?: string;
  receivedAt?: Date;
}

export const emailService = {
  async connectIntegration(userId: string, data: {
    provider: string;
    providerAccountId: string;
    accessToken?: string;
    refreshToken?: string;
  }) {
    const integration = await prisma.emailIntegration.upsert({
      where: {
        userId_provider_providerAccountId: {
          userId,
          provider: data.provider,
          providerAccountId: data.providerAccountId,
        },
      },
      update: {
        encryptedAccessToken: data.accessToken ? encrypt(data.accessToken) : null,
        encryptedRefreshToken: data.refreshToken ? encrypt(data.refreshToken) : null,
        syncStatus: 'IDLE',
        isEnabled: true,
      },
      create: {
        userId,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        encryptedAccessToken: data.accessToken ? encrypt(data.accessToken) : null,
        encryptedRefreshToken: data.refreshToken ? encrypt(data.refreshToken) : null,
        syncStatus: 'IDLE',
        isEnabled: true,
      },
    });

    return integration;
  },

  async getIntegrations(userId: string) {
    const list = await prisma.emailIntegration.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        syncStatus: true,
        isEnabled: true,
        lastSyncAt: true,
        createdAt: true,
        _count: {
          select: { processedEmails: true },
        },
      },
    });
    return list;
  },

  async processIncomingEmail(userId: string, integrationId: string, email: EmailMessagePayload) {
    // 1. Check if email was already processed (Idempotency)
    const existing = await prisma.processedEmail.findUnique({
      where: {
        integrationId_providerMessageId: {
          integrationId,
          providerMessageId: email.messageId,
        },
      },
    });

    if (existing) {
      logger.debug('Skipping already processed email', { messageId: email.messageId });
      return { status: 'SKIPPED_DUPLICATE', id: existing.id };
    }

    // 2. Clean body text: strip HTML before truncating so char budget goes to real content
    const rawBody = email.body && email.body !== email.snippet ? email.body : null;
    // Body arriving here should already be cleaned by googleOAuthService, but we guard anyway
    const bodyText = rawBody ? rawBody.slice(0, 8000) : null;

    // 3. AI Entity Extraction (runs before regex classify so AI result can override)
    let aiResult = null;
    try {
      aiResult = await aiEntityExtractorService.extract(
        email.sender,
        email.subject,
        bodyText || email.snippet,
      );
    } catch (aiErr) {
      logger.warn('AI entity extraction threw unexpectedly', { error: String(aiErr) });
    }

    // 4. Classify Email (regex-based, enriched by AI result when confident)
    const classificationResult = emailClassificationService.classify(email, aiResult);

    // 5. Match to User Applications
    const matchResult = await emailMatchingService.matchEmailToApplication(userId, {
      detectedCompany: classificationResult.detectedCompany,
      detectedRole: classificationResult.detectedRole,
      sender: email.sender,
      subject: email.subject,
    });

    // 6. Save Processed Email Record
    const processedRecord = await prisma.processedEmail.create({
      data: {
        integrationId,
        providerMessageId: email.messageId,
        sender: email.sender,
        subject: email.subject,
        snippet: email.snippet,
        body: bodyText,
        classification: classificationResult.classification,
        confidence: classificationResult.confidence,
        receivedAt: email.receivedAt || new Date(),
        processedAt: new Date(),
        linkedApplicationId: matchResult.application?.id || null,
      },
    });

    // 7. Trigger Automation Suggestion / Update Pipeline
    const automationResult = await automationSuggestionService.processDetectedEmail({
      userId,
      applicationId: matchResult.application?.id || null,
      classification: classificationResult.classification,
      confidence: classificationResult.confidence,
      reason: classificationResult.reason,
      sender: email.sender,
      subject: email.subject,
      snippet: email.snippet,
      body: bodyText || undefined,
      detectedCompany: classificationResult.detectedCompany,
      detectedRole: classificationResult.detectedRole,
    });

    return {
      processedRecord,
      classificationResult,
      matchResult,
      automationResult,
    };
  },
};

