-- Preserve the legacy patient/unit relation before making Patient global.
INSERT INTO "PatientClinic" ("patientId", "clinicId", "active", "createdAt", "updatedAt")
SELECT p."id", p."clinicId", TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Patient" p
WHERE p."clinicId" IS NOT NULL
ON CONFLICT ("patientId", "clinicId") DO NOTHING;

-- A identidade do paciente é global. Os vínculos por unidade ficam em PatientClinic.
DROP INDEX IF EXISTS "Patient_clinicId_idx";
ALTER TABLE "Patient" DROP CONSTRAINT IF EXISTS "Patient_clinicId_fkey";
ALTER TABLE "Patient" DROP COLUMN IF EXISTS "clinicId";
