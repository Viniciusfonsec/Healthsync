import type { Repositories } from '../../domain/repositories/contracts.js';
import { conflict, forbidden, notFound } from '../../domain/errors/DomainError.js';
import { nowIso } from '../../domain/entities/types.js';
import type { Attendance, AttendanceStatus } from '../../domain/entities/types.js';
import type { AvailabilitySlotInput, AttendanceCreateInput } from './dtos.js';
import { activeAppointmentStatuses, overlaps, timeToMinutes, ensureValidRange } from './scheduleRules.js';

export class ProfessionalService {
  constructor(private readonly r: Repositories) {}
  async agenda(professionalId: number, from: string, to: string, clinicId: number) {
    const start = new Date(from);
    const end = new Date(to);
    ensureValidRange(start, end, 'Intervalo da agenda inválido');
    if (clinicId) {
      return this.r.appointments.findByProfessionalClinicAndRange(professionalId, clinicId, start, end);
    }
    return this.r.appointments.findByProfessionalAndRange(professionalId, start, end);
  }
  async appointmentById(professionalId: number, clinicId: number, appointmentId: number) {
    const appointment = await this.r.appointments.findById(appointmentId);
    if (!appointment || appointment.professionalId !== professionalId || appointment.clinicId !== clinicId) {
      throw notFound('Consulta não encontrada');
    }
    const [attendance, patient] = await Promise.all([
      this.r.attendances.findByAppointmentId(appointmentId),
      this.r.patients.findById(appointment.patientId),
    ]);
    return {
      ...appointment,
      patient: patient ? { name: patient.name, email: patient.email, phone: patient.phone } : undefined,
      attendance,
      performedAt: attendance?.finishedAt,
    };
  }
  /**
   * Registra que o paciente não compareceu (status FALTA). Só vale para consulta
   * do próprio profissional, na unidade atual, já iniciada no horário e sem atendimento aberto.
   */
  async markNoShow(professionalId: number, clinicId: number, appointmentId: number) {
    const appointment = await this.r.appointments.findById(appointmentId);
    if (!appointment || appointment.professionalId !== professionalId || appointment.clinicId !== clinicId) {
      throw notFound('Consulta não encontrada');
    }
    if (!activeAppointmentStatuses.includes(appointment.status)) {
      throw conflict('Somente consultas agendadas ou confirmadas podem ser marcadas como falta');
    }
    if (new Date(appointment.dateTime).getTime() > Date.now()) {
      throw conflict('Não é possível registrar falta antes do horário da consulta');
    }
    if (await this.r.attendances.findByAppointmentId(appointmentId)) {
      throw conflict('A consulta já possui atendimento registrado');
    }
    return this.r.appointments.update(appointmentId, { status: 'FALTA', updatedAt: nowIso() });
  }
  async history(professionalId: number, clinicId: number) {
    const appointments = await this.r.appointments.findByProfessionalId(professionalId);
    const history = await Promise.all(
      appointments
        .filter((appointment) => !clinicId || appointment.clinicId === clinicId)
        .map(async (appointment) => {
          const attendance = await this.r.attendances.findByAppointmentId(appointment.id);
          if (!attendance && !['REALIZADA', 'FALTA', 'CANCELADA'].includes(appointment.status)) return null;
          const patient = await this.r.patients.findById(appointment.patientId);
          return {
            ...appointment,
            patient: patient ? { name: patient.name, email: patient.email, phone: patient.phone } : undefined,
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
            performedAt: attendance?.finishedAt,
          };
        }),
    );
    return history
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort(
        (a, b) =>
          new Date(b.performedAt || b.dateTime).getTime() - new Date(a.performedAt || a.dateTime).getTime(),
      );
  }
  async availability(professionalId: number) {
    const professional = await this.r.professionals.findById(professionalId);
    if (!professional) {
      throw notFound('Profissional não encontrado');
    }
    return this.r.availabilities.findByProfessionalId(professionalId);
  }
  async saveAvailability(professionalId: number, slots: AvailabilitySlotInput[]) {
    return this.r.transaction((repos) =>
      new ProfessionalService(repos).saveAvailabilitySteps(professionalId, slots),
    );
  }
  /** Passos de `saveAvailability`; sempre executados dentro de uma transação. */
  private async saveAvailabilitySteps(professionalId: number, slots: AvailabilitySlotInput[]) {
    const professional = await this.r.professionals.findById(professionalId);
    if (!professional) {
      throw notFound('Profissional não encontrado');
    }
    for (const slot of slots) {
      const start = timeToMinutes(slot.startTime);
      const end = timeToMinutes(slot.endTime);
      if (start >= end) {
        throw conflict('O horário inicial deve ser menor que o horário final');
      }
      if (slot.durationMinutes > end - start) {
        throw conflict('A duração da consulta não cabe no período informado');
      }
    }
    await this.r.availabilities.deleteByProfessionalId(professionalId);
    const saved = [];
    for (const slot of slots) {
      saved.push(
        await this.r.availabilities.create({
          professionalId,
          ...slot,
          active: true,
        }),
      );
    }
    return saved;
  }
  async blockAgenda(professionalId: number, startsAt: string, endsAt: string, reason: string) {
    const professional = await this.r.professionals.findById(professionalId);
    if (!professional) {
      throw notFound('Profissional não encontrado');
    }
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    ensureValidRange(start, end, 'Período de bloqueio inválido');
    const conflicts = await this.r.appointments.findByProfessionalAndRange(professionalId, start, end);
    if (conflicts.some((a) => activeAppointmentStatuses.includes(a.status))) {
      throw conflict('Existem consultas no período selecionado');
    }
    const existingBlocks = await this.r.blocks.findByProfessionalAndRange(professionalId, start, end);
    if (
      existingBlocks.some((block) =>
        overlaps(
          start,
          end,
          new Date(block.startsAt),
          (new Date(block.endsAt).getTime() - new Date(block.startsAt).getTime()) / 60_000,
        ),
      )
    ) {
      throw conflict('Já existe um bloqueio no período selecionado');
    }
    return this.r.blocks.create({
      professionalId,
      startsAt,
      endsAt,
      reason,
      active: true,
      createdAt: nowIso(),
    });
  }
  async duration(professionalId: number, minutes: number) {
    if (minutes < 5 || minutes > 240) {
      throw conflict('Duração fora do intervalo permitido');
    }
    const professional = await this.r.professionals.findById(professionalId);
    if (!professional) {
      throw notFound('Profissional não encontrado');
    }
    return this.r.professionals.update(professionalId, {
      consultationDurationMinutes: minutes,
      updatedAt: nowIso(),
    });
  }
  async findPatientHistory(cpf: string, clinicId: number) {
    const patient = await this.r.patients.findByCpf(cpf);
    if (!patient) {
      throw notFound('Paciente não encontrado');
    }
    const appointments = (await this.r.appointments.findByPatientId(patient.id)).filter(
      (appointment) => appointment.clinicId === clinicId,
    );
    const attendances = [];
    for (const appointment of appointments) {
      const attendance = await this.r.attendances.findByAppointmentId(appointment.id);
      if (attendance) {
        attendances.push(attendance);
      }
    }
    return {
      patient,
      attendances,
    };
  }
  async createAttendance(
    professionalId: number,
    clinicId: number,
    appointmentId: number,
    data: AttendanceCreateInput,
  ) {
    return this.r.transaction((repos) =>
      new ProfessionalService(repos).createAttendanceSteps(professionalId, clinicId, appointmentId, data),
    );
  }
  /** Passos de `createAttendance`; sempre executados dentro de uma transação. */
  private async createAttendanceSteps(
    professionalId: number,
    clinicId: number,
    appointmentId: number,
    data: AttendanceCreateInput,
  ) {
    const appointment = await this.r.appointments.findById(appointmentId);
    if (!appointment || appointment.professionalId !== professionalId || appointment.clinicId !== clinicId) {
      throw notFound('Consulta não encontrada');
    }
    if (!['AGENDADA', 'CONFIRMADA'].includes(appointment.status)) {
      throw conflict('Atendimento só pode iniciar para consulta agendada ou confirmada');
    }
    const existing = await this.r.attendances.findByAppointmentId(appointmentId);
    if (existing) {
      throw conflict('Atendimento já registrado');
    }
    const startedAt = nowIso();
    const attendance = await this.r.attendances.create({
      appointmentId,
      professionalId,
      status: 'ABERTO',
      ...data,
      startedAt,
      createdAt: startedAt,
      updatedAt: startedAt,
    });
    return attendance;
  }
  async updateAttendanceStatus(
    professionalId: number,
    clinicId: number,
    attendanceId: number,
    status: AttendanceStatus,
  ) {
    return this.r.transaction((repos) =>
      new ProfessionalService(repos).updateAttendanceStatusSteps(
        professionalId,
        clinicId,
        attendanceId,
        status,
      ),
    );
  }
  /** Passos de `updateAttendanceStatus`; sempre executados dentro de uma transação. */
  private async updateAttendanceStatusSteps(
    professionalId: number,
    clinicId: number,
    attendanceId: number,
    status: AttendanceStatus,
  ) {
    const attendance = await this.r.attendances.findById(attendanceId);
    if (!attendance || attendance.professionalId !== professionalId) {
      throw notFound('Atendimento não encontrado');
    }
    const appointment = await this.r.appointments.findById(attendance.appointmentId);
    if (!appointment || appointment.clinicId !== clinicId) {
      throw forbidden('O atendimento não pertence à unidade selecionada');
    }
    const transitions: Record<AttendanceStatus, AttendanceStatus[]> = {
      ABERTO: ['EM_ANDAMENTO', 'CANCELADO'],
      EM_ANDAMENTO: ['FINALIZADO', 'CANCELADO'],
      FINALIZADO: [],
      CANCELADO: [],
    };
    if (attendance.status !== status && !transitions[attendance.status].includes(status)) {
      throw conflict(`Transição inválida: ${attendance.status} -> ${status}`);
    }
    const patch: Partial<Attendance> = {
      status,
      updatedAt: nowIso(),
    };
    if (status === 'FINALIZADO') {
      patch.finishedAt = nowIso();
      await this.r.appointments.update(attendance.appointmentId, {
        status: 'REALIZADA',
        updatedAt: nowIso(),
      });
    }
    return this.r.attendances.update(attendance.id, patch);
  }
}
