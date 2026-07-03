-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_apiKeyId_idempotencyKey_key" ON "Event"("apiKeyId", "idempotencyKey");
