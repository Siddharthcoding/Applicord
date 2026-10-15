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
      include_granted_scopes: 'true',
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

    // Verify user granted Gmail read permissions (Google Granular Permissions)
    if (typeof tokenData.scope === 'string') {
      const grantedScopes = tokenData.scope.split(' ');
      const hasGmailScope = grantedScopes.some((s: string) =>
        s.includes('gmail.readonly') || s === 'https://mail.google.com/' || s.includes('gmail.modify')
      );

      if (!hasGmailScope) {
        logger.warn('Google OAuth completed but Gmail permission was omitted/denied by user', {
          grantedScopes: tokenData.scope,
        });
        throw new Error(
          'Gmail permission was not granted. On the Google authorization screen, please check the box to allow Applicord to view your email messages.'
        );
      }
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

    // Hard 50s deadline — ensures HTTP handler always responds even if Gmail is slow
    const syncDeadline = Date.now() + 50_000;
    const isOverDeadline = () => Date.now() > syncDeadline;

    try {
      const accessToken = await this.getValidAccessToken(integration);
      if (!accessToken) {
        const authErr: any = new Error('No valid access token available for Gmail sync. Please reconnect your account.');
        authErr.statusCode = 401;
        throw authErr;
      }

      // Helper: fetch with per-request timeout
      const fetchWithTimeout = async (url: string, timeoutMs = 8000) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          });
          return res;
        } finally {
          clearTimeout(timer);
        }
      };

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
        if (payload.body?.data) {
          const decoded = Buffer.from(payload.body.data, 'base64url').toString('utf8');
          if (payload.mimeType === 'text/html' || decoded.includes('<html') || decoded.includes('<!DOCTYPE')) {
            return htmlToPlainText(decoded);
          }
          return decoded.trim();
        }
        const plainText = findPlainTextPart(payload);
        if (plainText) {
          if (plainText.includes('<html') || plainText.includes('<!DOCTYPE')) {
            return htmlToPlainText(plainText);
          }
          return plainText.trim();
        }
        const htmlText = findHtmlPart(payload);
        if (htmlText) return htmlText;
        return '';
      };

      // ── Incremental sync via Gmail History API ────────────────────────────────
      // If we have a saved historyId, only fetch messages added since then.
      // On the very first sync (no historyId), use a date filter capped at 90 days.
      let messageIds: string[] = [];
      let newHistoryId: string | null = null;

      const lastHistoryId = (integration as any).lastHistoryId as string | null;

      if (lastHistoryId) {
        // Incremental: use Gmail History API — only new messages since last sync
        const historyUrl = `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${lastHistoryId}&historyTypes=messageAdded&maxResults=25`;
        let histRes: Response;
        try {
          histRes = await fetchWithTimeout(historyUrl, 10000);
        } catch (fetchErr: any) {
          if (fetchErr.name === 'AbortError') {
            logger.warn('[Gmail Sync] History fetch timed out, falling back to full query');
            histRes = null as any;
          } else {
            throw fetchErr;
          }
        }

        if (histRes && histRes.ok) {
          const histData = (await histRes.json()) as any;
          newHistoryId = histData.historyId || null;
          const historyRecords: any[] = histData.history || [];
          for (const record of historyRecords) {
            for (const added of record.messagesAdded || []) {
              if (added.message?.id) {
                messageIds.push(added.message.id);
              }
            }
          }
          logger.info(`[Gmail Sync] Incremental: ${messageIds.length} new messages since historyId ${lastHistoryId}`);
        } else if (histRes && histRes.status === 404) {
          // historyId expired — fall through to full query below
          logger.warn('[Gmail Sync] HistoryId expired (404), falling back to full query');
          lastHistoryId && (messageIds = []); // trigger fallback
        } else if (histRes) {
          // Non-404 error from history API — check for auth issues
          if (histRes.status === 401 || histRes.status === 403) {
            const authErr: any = new Error(
              'Gmail permission denied. Please disconnect and reconnect your account.'
            );
            authErr.statusCode = histRes.status;
            throw authErr;
          }
        }
      }

      // Full query fallback: no historyId, or historyId expired
      if (!lastHistoryId || messageIds.length === 0 && !newHistoryId) {
        const query = 'subject:(applied OR application OR interview OR offer OR assessment OR update OR status OR candidate OR candidacy OR "thank you" OR careers OR recruiting OR decision OR position OR job OR "next steps")';
        // On first sync, cap to last 90 days so we don't scan the entire inbox
        const afterDate = !lastHistoryId
          ? `after:${Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000)}`
          : '';
        const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
          afterDate ? `${query} ${afterDate}` : query
        )}&maxResults=25`;

        let listRes: Response;
        try {
          listRes = await fetchWithTimeout(listUrl, 12000);
        } catch (fetchErr: any) {
          if (fetchErr.name === 'AbortError') {
            const timeoutErr: any = new Error('Gmail API timed out. Please try again in a moment.');
            timeoutErr.statusCode = 504;
            throw timeoutErr;
          }
          throw fetchErr;
        }

        if (!listRes.ok) {
          const errorText = await listRes.text();
          let isScopeError = false;
          try {
            const parsed = JSON.parse(errorText);
            const errorDetails = parsed?.error?.details || [];
            const reasons = errorDetails.map((d: any) => d?.reason);
            if (
              parsed?.error?.code === 403 &&
              (reasons.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
                errorText.includes('insufficient authentication scopes') ||
                errorText.includes('insufficientPermissions'))
            ) {
              isScopeError = true;
            }
          } catch {
            if (listRes.status === 403 && errorText.includes('insufficientPermissions')) {
              isScopeError = true;
            }
          }

          if (isScopeError || listRes.status === 403) {
            const authErr: any = new Error(
              'Gmail permission denied. Please disconnect and reconnect your account, making sure to check the box allowing email access.'
            );
            authErr.statusCode = 403;
            throw authErr;
          }

          if (listRes.status === 401) {
            const authErr: any = new Error(
              'Google authentication expired. Please disconnect and reconnect your Gmail account.'
            );
            authErr.statusCode = 401;
            throw authErr;
          }

          const apiErr: any = new Error(`Gmail API list messages error: ${errorText}`);
          apiErr.statusCode = 502;
          throw apiErr;
        }

        const listData = (await listRes.json()) as any;
        newHistoryId = listData.historyId || null;
        messageIds = (listData.messages || []).map((m: any) => m.id);
        logger.info(`[Gmail Sync] Full query: ${messageIds.length} messages found`);
      }

      // ── Process each message ──────────────────────────────────────────────────
      let syncedCount = 0;

      for (const msgId of messageIds) {
        // Stop if we're over the hard deadline
        if (isOverDeadline()) {
          logger.warn(`[Gmail Sync] Reached 50s deadline, stopping after ${syncedCount} messages`);
          break;
        }

        try {
          const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`;
          let msgRes: Response;
          try {
            msgRes = await fetchWithTimeout(msgUrl, 8000);
          } catch (fetchErr: any) {
            if (fetchErr.name === 'AbortError') {
              logger.warn(`[Gmail Sync] Message ${msgId} fetch timed out, skipping`);
              continue;
            }
            throw fetchErr;
          }

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
          const body = extractMessageBody(msg.payload) || snippet;

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
          logger.warn(`[Gmail Sync] Error processing message ${msgId}`, { error: String(msgErr) });
        }
      }

      // Save the new historyId cursor so next sync is incremental
      await prisma.emailIntegration.update({
        where: { id: integrationId },
        data: {
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date(),
          ...(newHistoryId ? { lastHistoryId: newHistoryId } : {}),
        },
      });

      logger.info(`[Gmail Sync] Done. Processed ${syncedCount} new emails for integration ${integrationId}`);
      return { syncedCount };
    } catch (err: any) {
      logger.error('Failed to sync Gmail inbox', { error: String(err) });
      const isAuthError =
        err.statusCode === 401 ||
        err.statusCode === 403 ||
        String(err).includes('insufficient authentication scopes') ||
        String(err).includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT');

      await prisma.emailIntegration.update({
        where: { id: integrationId },
        data: { syncStatus: isAuthError ? 'AUTH_REQUIRED' : 'FAILED' },
      });
      throw err;
    }
  },
};

