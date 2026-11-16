import type { Repositories } from '../../domain/repositories/contracts.js';
import { ensureValidRange } from './scheduleRules.js';

/** Relatórios da unidade: faltas (US018) e produtividade (US019). */
export class ReportService {
  constructor(private readonly r: Repositories) {}

  async absences(from: string, to: string, clinicId: number) {
    const start = new Date(from);
    const end = new Date(to);
    ensureValidRange(start, end, 'Intervalo do relatório inválido');
    const list = await this.r.appointments.findByDateTimeRange(start, end);
    return list
      .filter((appointment) => appointment.clinicId === clinicId && appointment.status === 'FALTA')
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }
  /** US019: atendimentos por profissional no período, somente da unidade do administrador. */

  async productivity(from: string, to: string, clinicId: number) {
    const start = new Date(from);
    const end = new Date(to);
    ensureValidRange(start, end, 'Intervalo do relatório inválido');
    const memberships = await this.r.professionalClinics.findByClinicId(clinicId);
    const memberIds = new Set(
      memberships
        .filter((membership) => membership.active !== false)
        .map((membership) => membership.professionalId),
    );
    const professionals = (await this.r.professionals.list()).filter(
      (professional) => professional.clinicId === clinicId || memberIds.has(professional.id),
    );
    return Promise.all(
      professionals.map(async (professional) => {
        const attendances = await this.r.attendances.findByProfessionalAndRange(professional.id, start, end);
        const inClinic: typeof attendances = [];
        for (const attendance of attendances) {
          const appointment = await this.r.appointments.findById(attendance.appointmentId);
          if (appointment?.clinicId === clinicId) inClinic.push(attendance);
        }
        return {
          professionalId: professional.id,
          professionalName: professional.name,
          totalAttendances: inClinic.length,
          finished: inClinic.filter((attendance) => attendance.status === 'FINALIZADO').length,
        };
      }),
    );
  }
}
