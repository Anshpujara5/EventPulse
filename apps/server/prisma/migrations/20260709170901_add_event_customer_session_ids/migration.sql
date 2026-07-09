-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "Event_projectId_customerId_idx" ON "Event"("projectId", "customerId");

-- CreateIndex
CREATE INDEX "Event_projectId_sessionId_idx" ON "Event"("projectId", "sessionId");

-- CreateIndex
CREATE INDEX "Event_projectId_sessionId_createdAt_idx" ON "Event"("projectId", "sessionId", "createdAt");
