-- CreateIndex
CREATE INDEX "application_status_history_applicationId_timestamp_idx" ON "application_status_history"("applicationId", "timestamp");

-- CreateIndex
CREATE INDEX "automation_suggestions_userId_status_idx" ON "automation_suggestions"("userId", "status");

-- CreateIndex
CREATE INDEX "automation_suggestions_userId_createdAt_idx" ON "automation_suggestions"("userId", "createdAt");
