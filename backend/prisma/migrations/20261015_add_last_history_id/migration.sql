-- Add lastHistoryId to email_integrations for Gmail incremental sync
-- This cursor allows syncGmailInbox to only fetch NEW messages since the last sync
-- instead of always re-scanning the same 50 emails.

ALTER TABLE "email_integrations" ADD COLUMN IF NOT EXISTS "lastHistoryId" TEXT;
