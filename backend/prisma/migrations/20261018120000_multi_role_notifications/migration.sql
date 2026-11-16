ALTER TYPE "CommunicationChannel" ADD VALUE IF NOT EXISTS 'IN_APP';

ALTER TABLE "Notification" ALTER COLUMN "patientId" DROP NOT NULL;
ALTER TABLE "Notification" ADD COLUMN "userId" INTEGER;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
