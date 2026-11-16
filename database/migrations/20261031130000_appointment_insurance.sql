ALTER TABLE "Appointment" ADD COLUMN "insuranceUsed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Appointment" ADD COLUMN "insuranceProvider" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "insuranceMemberNumber" TEXT;
