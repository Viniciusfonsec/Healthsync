CREATE TYPE "Role" AS ENUM ('PACIENTE', 'PROFISSIONAL', 'ADMINISTRADOR', 'ADMIN_MASTER');
CREATE TYPE "AppointmentStatus" AS ENUM ('AGENDADA', 'CONFIRMADA', 'REALIZADA', 'CANCELADA', 'FALTA');
CREATE TYPE "AppointmentType" AS ENUM ('PRESENCIAL', 'TELEMEDICINA');
CREATE TYPE "AttendanceStatus" AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO');
CREATE TYPE "NotificationType" AS ENUM ('CONSULTA', 'LEMBRETE', 'RESULTADO', 'SISTEMA', 'MENSAGEM');
CREATE TYPE "CommunicationChannel" AS ENUM ('WHATSAPP', 'EMAIL');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDENTE', 'ENVIADO', 'ERRO', 'CANCELADO');
CREATE TYPE "DocumentType" AS ENUM ('EXAME', 'DOCUMENTO', 'PRESCRICAO', 'OUTRO');
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'CANCEL', 'RESCHEDULE', 'CONFIRM', 'UPLOAD', 'STATUS_CHANGE');

CREATE TABLE "Clinic" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "document" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Clinic_name_key" ON "Clinic"("name");
CREATE INDEX "Clinic_active_idx" ON "Clinic"("active");

CREATE TABLE "User" (
  "id" SERIAL NOT NULL,
  "clinicId" INTEGER NOT NULL,
  "role" "Role" NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "isGuest" BOOLEAN NOT NULL DEFAULT false,
  "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "User_failedLoginAttempts_check" CHECK ("failedLoginAttempts" >= 0)
);
CREATE UNIQUE INDEX "User_clinicId_email_key" ON "User"("clinicId", "email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_clinicId_role_idx" ON "User"("clinicId", "role");
ALTER TABLE "User" ADD CONSTRAINT "User_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Patient" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "clinicId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "cpf" TEXT NOT NULL,
  "birthDate" TEXT NOT NULL,
  "gender" TEXT NOT NULL,
  "bloodType" TEXT,
  "plan" TEXT,
  "address" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");
CREATE UNIQUE INDEX "Patient_cpf_key" ON "Patient"("cpf");
CREATE INDEX "Patient_clinicId_idx" ON "Patient"("clinicId");
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PatientClinic" (
  "id" SERIAL NOT NULL,
  "patientId" INTEGER NOT NULL,
  "clinicId" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientClinic_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PatientClinic_patientId_clinicId_key" ON "PatientClinic"("patientId", "clinicId");
CREATE INDEX "PatientClinic_clinicId_active_idx" ON "PatientClinic"("clinicId", "active");
ALTER TABLE "PatientClinic" ADD CONSTRAINT "PatientClinic_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientClinic" ADD CONSTRAINT "PatientClinic_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Professional" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "clinicId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "crm" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "consultationDurationMinutes" INTEGER NOT NULL DEFAULT 30,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Professional_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Professional_userId_key" ON "Professional"("userId");
CREATE UNIQUE INDEX "Professional_crm_key" ON "Professional"("crm");
CREATE INDEX "Professional_clinicId_active_idx" ON "Professional"("clinicId", "active");
ALTER TABLE "Professional" ADD CONSTRAINT "Professional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Professional" ADD CONSTRAINT "Professional_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ProfessionalClinic" (
  "id" SERIAL NOT NULL,
  "professionalId" INTEGER NOT NULL,
  "clinicId" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfessionalClinic_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProfessionalClinic_professionalId_clinicId_key" ON "ProfessionalClinic"("professionalId", "clinicId");
CREATE INDEX "ProfessionalClinic_clinicId_active_idx" ON "ProfessionalClinic"("clinicId", "active");
ALTER TABLE "ProfessionalClinic" ADD CONSTRAINT "ProfessionalClinic_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalClinic" ADD CONSTRAINT "ProfessionalClinic_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Administrator" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Administrator_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Administrator_userId_key" ON "Administrator"("userId");
ALTER TABLE "Administrator" ADD CONSTRAINT "Administrator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Specialty" (
  "id" SERIAL NOT NULL,
  "clinicId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "avgMinutes" INTEGER NOT NULL DEFAULT 30,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Specialty_clinicId_name_key" ON "Specialty"("clinicId", "name");
CREATE INDEX "Specialty_clinicId_active_idx" ON "Specialty"("clinicId", "active");
ALTER TABLE "Specialty" ADD CONSTRAINT "Specialty_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ProfessionalSpecialty" (
  "professionalId" INTEGER NOT NULL,
  "specialtyId" INTEGER NOT NULL,
  CONSTRAINT "ProfessionalSpecialty_pkey" PRIMARY KEY ("professionalId", "specialtyId")
);
CREATE INDEX "ProfessionalSpecialty_specialtyId_idx" ON "ProfessionalSpecialty"("specialtyId");
ALTER TABLE "ProfessionalSpecialty" ADD CONSTRAINT "ProfessionalSpecialty_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalSpecialty" ADD CONSTRAINT "ProfessionalSpecialty_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Appointment" (
  "id" SERIAL NOT NULL,
  "clinicId" INTEGER NOT NULL,
  "patientId" INTEGER NOT NULL,
  "professionalId" INTEGER NOT NULL,
  "specialtyId" INTEGER NOT NULL,
  "dateTime" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "type" "AppointmentType" NOT NULL,
  "location" TEXT NOT NULL,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'AGENDADA',
  "notes" TEXT,
  "cancellationReason" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Appointment_professionalId_dateTime_key" ON "Appointment"("professionalId", "dateTime");
CREATE INDEX "Appointment_patientId_dateTime_idx" ON "Appointment"("patientId", "dateTime");
CREATE INDEX "Appointment_professionalId_dateTime_idx" ON "Appointment"("professionalId", "dateTime");
CREATE INDEX "Appointment_clinicId_dateTime_idx" ON "Appointment"("clinicId", "dateTime");
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AvailabilitySlot" (
  "id" SERIAL NOT NULL,
  "professionalId" INTEGER NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AvailabilitySlot_professionalId_dayOfWeek_startTime_endTime_key" ON "AvailabilitySlot"("professionalId", "dayOfWeek", "startTime", "endTime");
CREATE INDEX "AvailabilitySlot_professionalId_dayOfWeek_active_idx" ON "AvailabilitySlot"("professionalId", "dayOfWeek", "active");
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AgendaBlock" (
  "id" SERIAL NOT NULL,
  "professionalId" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgendaBlock_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AgendaBlock_professionalId_startsAt_endsAt_idx" ON "AgendaBlock"("professionalId", "startsAt", "endsAt");
ALTER TABLE "AgendaBlock" ADD CONSTRAINT "AgendaBlock_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Attendance" (
  "id" SERIAL NOT NULL,
  "appointmentId" INTEGER NOT NULL,
  "professionalId" INTEGER NOT NULL,
  "status" "AttendanceStatus" NOT NULL DEFAULT 'ABERTO',
  "notes" TEXT,
  "diagnosis" TEXT,
  "prescription" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Attendance_appointmentId_key" ON "Attendance"("appointmentId");
CREATE INDEX "Attendance_professionalId_createdAt_idx" ON "Attendance"("professionalId", "createdAt");
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Document" (
  "id" SERIAL NOT NULL,
  "attendanceId" INTEGER NOT NULL,
  "patientId" INTEGER NOT NULL,
  "uploadedBy" INTEGER NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "type" "DocumentType" NOT NULL,
  "iv" TEXT NOT NULL,
  "authTag" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Document_attendanceId_originalName_key" ON "Document"("attendanceId", "originalName");
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Document_patientId_idx" ON "Document"("patientId");
CREATE INDEX "Document_attendanceId_idx" ON "Document"("attendanceId");
ALTER TABLE "Document" ADD CONSTRAINT "Document_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Notification" (
  "id" SERIAL NOT NULL,
  "patientId" INTEGER NOT NULL,
  "appointmentId" INTEGER,
  "type" "NotificationType" NOT NULL,
  "channel" "CommunicationChannel" NOT NULL,
  "content" TEXT NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDENTE',
  "readAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Notification_patientId_createdAt_idx" ON "Notification"("patientId", "createdAt");
CREATE INDEX "Notification_status_createdAt_idx" ON "Notification"("status", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AuditLog" (
  "id" SERIAL NOT NULL,
  "actorUserId" INTEGER,
  "action" "AuditAction" NOT NULL,
  "resource" TEXT NOT NULL,
  "resourceId" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
CREATE INDEX "AuditLog_resource_createdAt_idx" ON "AuditLog"("resource", "createdAt");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SystemSettings" (
  "id" INTEGER NOT NULL,
  "systemName" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "dateFormat" TEXT NOT NULL,
  "sessionTimeoutMinutes" INTEGER NOT NULL,
  "logRetentionDays" INTEGER NOT NULL,
  "minPasswordLength" INTEGER NOT NULL,
  "mfaRequired" BOOLEAN NOT NULL,
  "primaryColor" TEXT NOT NULL,
  "theme" TEXT NOT NULL,
  "compactMode" BOOLEAN NOT NULL,
  "smtp" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);
