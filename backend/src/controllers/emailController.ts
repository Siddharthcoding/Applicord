import { Response, NextFunction } from 'express';
import { emailService } from '../services/emailService';
import { googleOAuthService } from '../services/googleOAuthService';
import { automationSuggestionService } from '../services/automationSuggestionService';
import { resolveSuggestionSchema } from '../validators';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';
import { config } from '../config';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

export const emailController = {
  async getIntegrations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const list = await emailService.getIntegrations(userId);
      return sendSuccess(res, list);
    } catch (err) {
      next(err);
    }
  },

  async connectIntegration(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { provider, providerAccountId, accessToken, refreshToken } = req.body;
      const integration = await emailService.connectIntegration(userId, {
        provider: provider || 'GMAIL',
        providerAccountId: providerAccountId || `${req.user!.email}`,
        accessToken,
        refreshToken,
      });
      return sendSuccess(res, integration, 'Email integration connected successfully');
    } catch (err) {
      next(err);
    }
  },

  async listSuggestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { status } = req.query;
      const suggestions = await automationSuggestionService.listSuggestions(userId, status as any);
      return sendSuccess(res, suggestions);
    } catch (err) {
      next(err);
    }
  },

  async resolveSuggestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const suggestionId = req.params.id;
      const validated = resolveSuggestionSchema.parse(req.body);

      if (validated.action === 'ACCEPT') {
        const result = await automationSuggestionService.acceptSuggestion(
          userId,
          suggestionId,
          validated.targetApplicationId,
          validated.overrides
        );
        return sendSuccess(res, result, 'Suggestion accepted and application updated');
      } else {
        const result = await automationSuggestionService.rejectSuggestion(userId, suggestionId);
        return sendSuccess(res, result, 'Suggestion dismissed');
      }
    } catch (err) {
      next(err);
    }
  },

  async getGoogleAuthUrl(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const originHeader = req.headers.origin;
      const refererHeader = req.headers.referer;
      let frontendOrigin = config.frontendUrl;
      if (typeof originHeader === 'string' && originHeader) {
        frontendOrigin = originHeader;
      } else if (typeof refererHeader === 'string' && refererHeader) {
        try {
          frontendOrigin = new URL(refererHeader).origin;
        } catch {}
      }

      const url = googleOAuthService.getAuthorizationUrl(userId, frontendOrigin);
      return sendSuccess(res, { url });
    } catch (err) {
      next(err);
    }
  },

  async handleGoogleCallback(req: any, res: Response, next: NextFunction) {
    let fallbackOrigin = config.frontendUrl;
    try {
      const { code, state, error } = req.query;

      if (state) {
        try {
          const decoded = JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8'));
          if (decoded.frontendOrigin) fallbackOrigin = decoded.frontendOrigin;
        } catch {}
      }

      if (error) {
        return res.redirect(`${fallbackOrigin}/automation?error=${encodeURIComponent(String(error))}`);
      }
      if (!code || !state) {
        return res.redirect(`${fallbackOrigin}/automation?error=missing_oauth_parameters`);
      }

      const result = await googleOAuthService.handleOAuthCallback(String(code), String(state));
      const targetOrigin = result.frontendOrigin || fallbackOrigin;
      return res.redirect(`${targetOrigin}/automation?gmail_connected=true&account=${encodeURIComponent(result.googleEmail)}`);
    } catch (err: any) {
      logger.error('Google OAuth callback error', { error: String(err) });
      return res.redirect(`${fallbackOrigin}/automation?error=${encodeURIComponent(err.message || 'oauth_failed')}`);
    }
  },

  async syncIntegration(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const integrationId = req.params.id;
      const result = await googleOAuthService.syncGmailInbox(integrationId);
      return sendSuccess(res, result, 'Gmail inbox synced successfully');
    } catch (err) {
      next(err);
    }
  },

  async syncAllIntegrations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const integrations = await prisma.emailIntegration.findMany({
        where: { userId, provider: 'GMAIL', isEnabled: true },
      });

      const results = [];
      for (const integration of integrations) {
        try {
          const syncRes = await googleOAuthService.syncGmailInbox(integration.id);
          results.push({
            id: integration.id,
            email: integration.providerAccountId,
            success: true,
            ...syncRes,
          });
        } catch (err: any) {
          results.push({
            id: integration.id,
            email: integration.providerAccountId,
            success: false,
            error: err.message,
          });
        }
      }

      return sendSuccess(res, results, 'All connected Gmail inboxes synchronized');
    } catch (err) {
      next(err);
    }
  },

  async deleteIntegration(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const integrationId = req.params.id;
      await prisma.emailIntegration.deleteMany({
        where: { id: integrationId, userId },
      });
      return sendSuccess(res, null, 'Integration disconnected successfully');
    } catch (err) {
      next(err);
    }
  },
};
