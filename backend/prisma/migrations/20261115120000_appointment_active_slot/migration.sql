-- Um horário do profissional só fica "ocupado" por consultas ativas.
-- Antes, a regra valia também para consultas CANCELADAS, e o horário liberado
-- por um cancelamento nunca mais podia ser agendado (erro 500).
DROP INDEX IF EXISTS "Appointment_professionalId_dateTime_key";

CREATE UNIQUE INDEX "Appointment_professionalId_dateTime_active_key"
  ON "Appointment"("professionalId", "dateTime")
  WHERE "status" IN ('AGENDADA', 'CONFIRMADA');
