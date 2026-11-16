-- Verificação do padrão de identificação do HealthSync.
-- Todas as PKs e FKs de entidades são numéricas no schema atual.

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN (
    'id', 'userId', 'clinicId', 'patientId', 'professionalId',
    'specialtyId', 'appointmentId', 'attendanceId', 'uploadedBy',
    'actorUserId', 'resourceId', 'id_usuario', 'id_paciente',
    'id_profissional', 'id_clinica', 'id_consulta'
  )
ORDER BY table_name, ordinal_position;

-- Relações esperadas do projeto:
-- ProfessionalClinic(professionalId, clinicId)
-- PatientClinic(patientId, clinicId)
-- ProfessionalSpecialty(professionalId, specialtyId)
-- Appointment(patientId, professionalId, specialtyId, clinicId)
