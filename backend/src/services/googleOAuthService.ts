import { config } from '../config';
import { prisma } from '../config/prisma';
import { decrypt, encrypt } from '../utils/encryption';
import { logger } from '../utils/logger';
import { emailService } from './emailService';

export const googleOAuthService = {
  getAuthorizationUrl(userId: string, frontendOrigin?: string): string {
    if (!config.googleClientId) {
      throw new Error('Google OAuth is not configured. Missing GOOGLE_CLIENT_ID in server environment.');
    }

    const statePayload = Buffer.from(
      JSON.stringify({
        userId,
        frontendOrigin: frontendOrigin || config.frontendUrl,
        ts: Date.now(),
      })
    ).toString('base64url');

    const params = new URLSearchParams({
      client_id: config.googleClientId,
      redirect_uri: config.googleRedirectUri,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
      access_type: 'offline',
      prompt: 'select_account consent',
      state: statePayload,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  async handleOAuthCallback(code: string, state: string) {
    if (!config.googleClientId || !config.googleClientSecret) {
      throw new Error('Google OAuth credentials not configured on server.');
    }

    // Decode state
    let userId: string;
    let frontendOrigin = config.frontendUrl;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      userId = decoded.userId;
      if (decoded.frontendOrigin) {
        frontendOrigin = decoded.frontendOrigin;
      }
    } catch {
      throw new Error('Invalid state parameter in OAuth callback.');
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: config.googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenResponse.json()) as any;

    if (!tokenResponse.ok || !tokenData?.access_token) {
      logger.error('Failed to exchange Google OAuth code', { error: tokenData });
      throw new Error(tokenData?.error_description || 'Failed to exchange authorization code with Google.');
    }

    // Retrieve user email address from Google
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userinfo = (await userinfoResponse.json()) as any;
    const googleEmail: string = userinfo?.email || 'connected-account@gmail.com';

    // Save integration in database
    const integration = await prisma.emailIntegration.upsert({
      where: {
        userId_provider_providerAccountId: {
          userId,
          provider: 'GMAIL',
          providerAccountId: googleEmail,
        },
      },
      update: {
        encryptedAccessToken: encrypt(tokenData.access_token),
        encryptedRefreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : undefined,
        syncStatus: 'IDLE',
        isEnabled: true,
      },
      create: {
        userId,
        provider: 'GMAIL',
        providerAccountId: googleEmail,
        encryptedAccessToken: encrypt(tokenData.access_token),
        encryptedRefreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
        syncStatus: 'IDLE',
        isEnabled: true,
      },
    });

    // Trigger initial background sync
    this.syncGmailInbox(integration.id).catch((err) => {
      logger.error('Error during initial Gmail inbox sync', { error: String(err) });
    });

    return { integration, googleEmail, frontendOrigin };
  },

  async getValidAccessToken(integration: any): Promise<string> {
    if (!integration.encryptedRefreshToken) {
      return decrypt(integration.encryptedAccessToken || '');
    }

    const refreshToken = decrypt(integration.encryptedRefreshToken);
    if (!refreshToken) {
      return decrypt(integration.encryptedAccessToken || '');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.googleClientId,
          client_secret: config.googleClientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = (await response.json()) as any;
      if (response.ok && data?.access_token) {
        await prisma.emailIntegration.update({
          where: { id: integration.id },
          data: { encryptedAccessToken: encrypt(data.access_token) },
        });
        return data.access_token;
      }
    } catch (err) {
      logger.warn('Failed to refresh Google access token, falling back to cached token', { error: String(err) });
    }

    return decrypt(integration.encryptedAccessToken || '');
  },

  async syncGmailInbox(integrationId: string) {
    const integration = await prisma.emailIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || !integration.isEnabled) {
      return { syncedCount: 0 };
    }

    await prisma.emailIntegration.update({
      where: { id: integrationId },
      data: { syncStatus: 'SYNCING' },
    });

    try {
      const accessToken = await this.getValidAccessToken(integration);
      if (!accessToken) {
        throw new Error('No valid access token available for Gmail sync.');
      }

      // Query Gmail messages for application-related keywords (confirmations, interviews, assessments, rejections)
      const query = 'subject:(applied OR application OR interview OR offer OR assessment OR update OR status OR candidate OR candidacy OR "thank you" OR careers OR recruiting OR decision OR position OR job OR "next steps")';
      const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`;

      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!listRes.ok) {
        const errorText = await listRes.text();
        throw new Error(`Gmail API list messages error: ${errorText}`);
      }

      const listData = (await listRes.json()) as any;
      const messages: any[] = listData.messages || [];

      let syncedCount = 0;

      // Helper to clean HTML emails and convert to readable text
      const htmlToPlainText = (html: string): string => {
        if (!html) return '';
        return html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/<br\s*[\/]?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<\/div>/gi, '\n')
          .replace(/<\/tr>/gi, '\n')
          .replace(/<\/li>/gi, '\n')
          .replace(/<li[^>]*>/gi, '• ')
          .replace(/<\/h[1-6]>/gi, '\n\n')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&quot;/gi, '"')
          .replace(/&#39;/gi, "'")
          .replace(/&rsquo;/gi, "'")
          .replace(/&lsquo;/gi, "'")
          .replace(/&ldquo;/gi, '"')
          .replace(/&rdquo;/gi, '"')
          .replace(/&mdash;/gi, '—')
          .replace(/&ndash;/gi, '–')
          .replace(/[ \t]+/g, ' ')
          .replace(/\n\s*\n\s*\n+/g, '\n\n')
          .trim();
      };

      // Find plain text part first across nested multipart trees
      const findPlainTextPart = (part: any): string => {
        if (!part) return '';
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64url').toString('utf8');
        }
        if (part.parts && Array.isArray(part.parts)) {
          for (const sub of part.parts) {
            const found = findPlainTextPart(sub);
            if (found) return found;
          }
        }
        return '';
      };

      // Fallback to find HTML part and clean to readable text
      const findHtmlPart = (part: any): string => {
        if (!part) return '';
        if (part.mimeType === 'text/html' && part.body?.data) {
          const rawHtml = Buffer.from(part.body.data, 'base64url').toString('utf8');
          return htmlToPlainText(rawHtml);
        }
        if (part.parts && Array.isArray(part.parts)) {
          for (const sub of part.parts) {
            const found = findHtmlPart(sub);
            if (found) return found;
          }
        }
        return '';
      };

      // Master extractor: prioritizes true plain text, falls back to cleaned HTML
      const extractMessageBody = (payload: any): string => {
        if (!payload) return '';

        // 1. If payload has direct data
        if (payload.body?.data) {
          const decoded = Buffer.from(payload.body.data, 'base64url').toString('utf8');
          if (payload.mimeType === 'text/html' || decoded.includes('<html') || decoded.includes('<!DOCTYPE')) {
            return htmlToPlainText(decoded);
          }
          return decoded.trim();
        }

        // 2. Search multipart parts for plain text first
        const plainText = findPlainTextPart(payload);
        if (plainText) {
          // If plainText accidentally contains HTML doctype tags, clean it
          if (plainText.includes('<html') || plainText.includes('<!DOCTYPE')) {
            return htmlToPlainText(plainText);
          }
          return plainText.trim();
        }

        // 3. Fallback to HTML part cleaned of all tags
        const htmlText = findHtmlPart(payload);
        if (htmlText) {
          return htmlText;
        }

        return '';
      };

      for (const msgRef of messages) {
        try {
          const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}?format=full`;
          const msgRes = await fetch(msgUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!msgRes.ok) continue;

          const msg = (await msgRes.json()) as any;
          const headers: any[] = msg.payload?.headers || [];

          const getHeader = (name: string) => {
            const h = headers.find((x: any) => x.name.toLowerCase() === name.toLowerCase());
            return h ? h.value : '';
          };

          const sender = getHeader('From');
          const subject = getHeader('Subject');
          const dateStr = getHeader('Date');
          const snippet: string = msg.snippet || '';

          // Extract clean human-readable message body (NO raw HTML)
          const body = extractMessageBody(msg.payload) || snippet;

          // Process the incoming email through classification and application matching
          await emailService.processIncomingEmail(integration.userId, integration.id, {
            messageId: msg.id,
            sender,
            subject,
            snippet,
            body: body || snippet,
            receivedAt: dateStr ? new Date(dateStr) : new Date(parseInt(msg.internalDate || `${Date.now()}`, 10)),
          });

          syncedCount++;
        } catch (msgErr) {
          logger.warn(`Error processing Gmail message ${msgRef.id}`, { error: String(msgErr) });
        }
      }

      await prisma.emailIntegration.update({
        where: { id: integrationId },
        data: {
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date(),
        },
      });

      return { syncedCount };
    } catch (err: any) {
      logger.error('Failed to sync Gmail inbox', { error: String(err) });
      await prisma.emailIntegration.update({
        where: { id: integrationId },
        data: { syncStatus: 'FAILED' },
      });
      throw err;
    }
  },
};
