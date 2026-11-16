ALTER TABLE "Appointment" ADD COLUMN "teleconsultationUrl" TEXT;

UPDATE "Appointment"
SET "teleconsultationUrl" = 'https://meet.jit.si/HealthSync-' || md5(random()::text || clock_timestamp()::text || "id"::text)
WHERE "type" = 'TELEMEDICINA' AND "teleconsultationUrl" IS NULL;
