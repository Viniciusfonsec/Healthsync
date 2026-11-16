-- Preferência de atendimento do paciente (idoso, gestante, pessoa com deficiência)
CREATE TYPE "PatientPriority" AS ENUM ('IDOSO', 'GESTANTE', 'PESSOA_COM_DEFICIENCIA');
ALTER TABLE "Patient" ADD COLUMN "priorities" "PatientPriority"[] NOT NULL DEFAULT ARRAY[]::"PatientPriority"[];
