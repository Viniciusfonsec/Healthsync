import type { Repositories } from '../../domain/repositories/contracts.js';
import { conflict, notFound } from '../../domain/errors/DomainError.js';
import { nowIso } from '../../domain/entities/types.js';
import type { PatientProfilePatch } from './dtos.js';

export class PatientService {
  constructor(private readonly r: Repositories) {}
  async history(patientId: number) {
    const appointments = await this.r.appointments.findByPatientId(patientId);
    const history = await Promise.all(
      appointments
        .filter((a) => a.status === 'REALIZADA' || a.status === 'FALTA')
        .map(async (appointment) => {
          const attendance = await this.r.attendances.findByAppointmentId(appointment.id);
          return {
            ...appointment,
            attendance: attendance
              ? {
                  status: attendance.status,
                  notes: attendance.notes,
                  diagnosis: attendance.diagnosis,
                  prescription: attendance.prescription,
                  startedAt: attendance.startedAt,
                  finishedAt: attendance.finishedAt,
                }
              : undefined,
            // A data efetiva é distinta da data originalmente agendada.
            performedAt: attendance?.finishedAt,
          };
        }),
    );
    return history.sort(
      (a, b) =>
        new Date(b.performedAt || b.dateTime).getTime() - new Date(a.performedAt || a.dateTime).getTime(),
    );
  }
  async profile(userId: number) {
    const patient = await this.r.patients.findByUserId(userId);
    if (!patient) {
      throw notFound('Paciente não encontrado');
    }
    return patient;
  }
  async updateProfile(userId: number, patch: PatientProfilePatch) {
    const patient = await this.r.patients.findByUserId(userId);
    if (!patient) {
      throw notFound('Paciente não encontrado');
    }
    if (patch.email && patch.email.toLowerCase() !== patient.email.toLowerCase()) {
      const account = await this.r.users.findById(patient.userId);
      const existingUser = account
        ? await this.r.users.findByEmailAndClinic(patch.email, account.clinicId)
        : undefined;
      if (existingUser && existingUser.id !== patient.userId) {
        throw conflict('E-mail já cadastrado');
      }
    }
    const patientPatch = {
      ...patch,
      updatedAt: nowIso(),
    };
    return this.r.patients.update(patient.id, patientPatch);
  }
}
