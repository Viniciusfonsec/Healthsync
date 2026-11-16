import crypto from 'node:crypto';
import type { Repositories } from '../../domain/repositories/contracts.js';
import { conflict, forbidden, notFound } from '../../domain/errors/DomainError.js';
import { nowIso } from '../../domain/entities/types.js';
import type { Appointment, Notification } from '../../domain/entities/types.js';
import type { PasswordHasher } from '../../infrastructure/crypto/PasswordHasher.js';
import type { AppointmentCreateInput, PublicAppointmentCreateInput } from './dtos.js';
import {
  allowedReschedule,
  activeAppointmentStatuses,
  overlaps,
  timeToMinutes,
  dateAtTimeZone,
  zonedDayAndMinutes,
} from './scheduleRules.js';
import { formatDateTimeBR } from './dateFormat.js';

function createTeleconsultationUrl(type: string): string | undefined {
  if (type !== 'TELEMEDICINA') return undefined;
  // URL aleatória: não utiliza o identificador numérico da consulta na sala.
  return `https://meet.jit.si/HealthSync-${crypto.randomBytes(18).toString('hex')}`;
}

export class SchedulingService {
  constructor(private readonly r: Repositories) {}
  async listPatientAppointments(patientId: number) {
    return this.r.appointments.findByPatientId(patientId);
  }
  async createAppointment(input: AppointmentCreateInput) {
    return this.r.transaction((repos) => new SchedulingService(repos).createAppointmentSteps(input));
  }
  /** Passos de `createAppointment`; sempre executados dentro de uma transação. */
  private async createAppointmentSteps(input: AppointmentCreateInput) {
    const patient = await this.r.patients.findById(input.patientId);
    if (!patient) {
      throw notFound('Paciente não encontrado');
    }
    const clinic = await this.r.clinics.findById(input.clinicId);
    if (!clinic || !clinic.active) {
      throw notFound('Unidade não encontrada ou inativa');
    }
    const professional = await this.r.professionals.findById(input.professionalId);
    if (!professional) {
      throw notFound('Profissional não encontrado');
    }
    const professionalClinic = await this.r.professionalClinics.findByProfessionalAndClinic(
      professional.id,
      input.clinicId,
    );
    if (!professionalClinic && professional.clinicId !== input.clinicId) {
      throw forbidden('Profissional não pertence à clínica selecionada');
    }
    if (!professional.active) {
      throw conflict('Profissional está inativo');
    }
    const specialty = await this.r.specialties.findById(input.specialtyId);
    if (!specialty) {
      throw notFound('Especialidade não encontrada');
    }
    if (specialty.clinicId !== input.clinicId) {
      throw forbidden('Especialidade não pertence à clínica selecionada');
    }
    if (!specialty.active) {
      throw conflict('Especialidade está inativa');
    }
    if (!professional.specialties.includes(input.specialtyId)) {
      throw conflict('A especialidade informada não está vinculada ao profissional');
    }
    if (input.durationMinutes <= 0) {
      throw conflict('A duração da consulta deve ser maior que zero');
    }
    if (input.durationMinutes !== professional.consultationDurationMinutes) {
      throw conflict(`A duração da consulta deve ser de ${professional.consultationDurationMinutes} minutos`);
    }
    const start = new Date(input.dateTime);
    if (Number.isNaN(start.getTime())) {
      throw conflict('Data/hora inválida');
    }
    if (start.getTime() <= Date.now()) {
      throw conflict('Não é permitido agendar uma consulta no passado');
    }
    const end = new Date(start.getTime() + input.durationMinutes * 60_000);
    await this.ensureAvailable(professional.id, start, end, input.durationMinutes);
    await this.ensureAppointmentConflict(professional.id, start, end);
    await this.ensureBlockConflict(professional.id, start, end);

    // Pacientes podem utilizar qualquer unidade ativa da rede.
    // O vínculo com a clínica é criado sob demanda no primeiro agendamento,
    // evitando exigir um cadastro prévio do paciente em cada unidade.
    const patientClinic = await this.r.patientClinics.findByPatientAndClinic(patient.id, input.clinicId);
    if (!patientClinic) {
      const membershipTime = nowIso();
      await this.r.patientClinics.create({
        patientId: patient.id,
        clinicId: input.clinicId,
        active: true,
        createdAt: membershipTime,
        updatedAt: membershipTime,
      });
    }

    const appointment = await this.r.appointments.create({
      clinicId: input.clinicId,
      patientId: input.patientId,
      professionalId: input.professionalId,
      specialtyId: input.specialtyId,
      dateTime: input.dateTime,
      durationMinutes: input.durationMinutes,
      insuranceUsed: input.insuranceUsed ?? false,
      insuranceProvider: input.insuranceUsed ? input.insuranceProvider?.trim() : undefined,
      insuranceMemberNumber: input.insuranceUsed ? input.insuranceMemberNumber?.trim() : undefined,
      type: input.type,
      location: input.type === 'PRESENCIAL' ? 'Consultório' : 'Atendimento on-line',
      status: 'AGENDADA',
      teleconsultationUrl: createTeleconsultationUrl(input.type),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    await this.createAppointmentNotification(
      appointment,
      `Consulta agendada para ${formatDateTimeBR(input.dateTime)}`,
    );
    return appointment;
  }
  async createPublicAppointment(input: PublicAppointmentCreateInput, hasher: PasswordHasher) {
    return this.r.transaction((repos) =>
      new SchedulingService(repos).createPublicAppointmentSteps(input, hasher),
    );
  }
  /** Passos de `createPublicAppointment`; sempre executados dentro de uma transação. */
  private async createPublicAppointmentSteps(input: PublicAppointmentCreateInput, hasher: PasswordHasher) {
    const clinic = await this.r.clinics.findById(input.clinicId);
    if (!clinic || !clinic.active) {
      throw notFound('Unidade não encontrada ou inativa');
    }
    const professional = await this.r.professionals.findById(input.professionalId);
    const professionalClinic = professional
      ? await this.r.professionalClinics.findByProfessionalAndClinic(professional.id, input.clinicId)
      : undefined;
    if (
      !professional ||
      (!professionalClinic && professional.clinicId !== input.clinicId) ||
      !professional.active
    ) {
      throw conflict('Profissional indisponível para a unidade selecionada');
    }
    const specialty = await this.r.specialties.findById(input.specialtyId);
    if (!specialty || specialty.clinicId !== input.clinicId || !specialty.active) {
      throw conflict('Especialidade indisponível para a unidade selecionada');
    }
    if (!professional.specialties.includes(input.specialtyId)) {
      throw conflict('A especialidade não está vinculada ao profissional selecionado');
    }
    if (input.durationMinutes !== professional.consultationDurationMinutes) {
      throw conflict(`A duração da consulta deve ser de ${professional.consultationDurationMinutes} minutos`);
    }

    const start = new Date(input.dateTime);
    if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
      throw conflict('Data/hora inválida ou no passado');
    }
    const end = new Date(start.getTime() + input.durationMinutes * 60_000);
    await this.ensureAvailable(professional.id, start, end, input.durationMinutes);
    await this.ensureAppointmentConflict(professional.id, start, end);
    await this.ensureBlockConflict(professional.id, start, end);

    let patient = await this.r.patients.findByCpf(input.cpf);
    if (patient) {
      const membership = await this.r.patientClinics.findByPatientAndClinic(patient.id, input.clinicId);
      if (!membership) {
        await this.r.patientClinics.create({
          patientId: patient.id,
          clinicId: input.clinicId,
          active: true,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
      }
      patient = await this.r.patients.update(patient.id, {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        birthDate: input.birthDate,
        gender: input.gender.trim(),
        ...(input.priorities ? { priorities: input.priorities } : {}),
        updatedAt: nowIso(),
      });
    } else {
      const existingUser = await this.r.users.findByEmailAndClinic(input.email, input.clinicId);
      if (existingUser) {
        const existingPatient = await this.r.patients.findByUserId(existingUser.id);
        if (existingPatient && existingPatient.cpf !== input.cpf) {
          throw conflict('O e-mail informado já está associado a outro paciente nesta unidade');
        }
        if (!existingPatient) {
          throw conflict('O e-mail informado já está associado a um usuário da unidade');
        }
        patient = existingPatient;
      } else {
        const t = nowIso();
        const user = await this.r.users.create({
          clinicId: input.clinicId,
          role: 'PACIENTE',
          email: input.email.trim().toLowerCase(),
          passwordHash: await hasher.hash(crypto.randomUUID()),
          active: false,
          isGuest: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
          createdAt: t,
          updatedAt: t,
        });
        patient = await this.r.patients.create({
          userId: user.id,
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone.trim(),
          cpf: input.cpf,
          birthDate: input.birthDate,
          gender: input.gender.trim(),
          priorities: input.priorities ?? [],
          createdAt: t,
          updatedAt: t,
        });
        await this.r.patientClinics.create({
          patientId: patient.id,
          clinicId: input.clinicId,
          active: true,
          createdAt: t,
          updatedAt: t,
        });
      }
    }

    const appointment = await this.r.appointments.create({
      clinicId: input.clinicId,
      patientId: patient.id,
      professionalId: input.professionalId,
      specialtyId: input.specialtyId,
      dateTime: input.dateTime,
      durationMinutes: input.durationMinutes,
      insuranceUsed: input.insuranceUsed ?? false,
      insuranceProvider: input.insuranceUsed ? input.insuranceProvider?.trim() : undefined,
      insuranceMemberNumber: input.insuranceUsed ? input.insuranceMemberNumber?.trim() : undefined,
      type: input.type,
      location: input.type === 'PRESENCIAL' ? 'Consultório' : 'Atendimento on-line',
      status: 'AGENDADA',
      teleconsultationUrl: createTeleconsultationUrl(input.type),
      notes: input.notes?.trim() || undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    const created = appointment;
    await this.createAppointmentNotification(
      created,
      `Consulta agendada para ${formatDateTimeBR(input.dateTime)}`,
    );
    await this.r.auditLogs.create({
      action: 'CREATE',
      resource: 'Appointment',
      resourceId: created.id,
      metadata: {
        source: 'PUBLIC_BOOKING',
        clinicId: input.clinicId,
        lgpdConsentAccepted: input.lgpdConsentAccepted === true,
        lgpdConsentAt: nowIso(),
      },
      createdAt: nowIso(),
    });
    return created;
  }

  async availableSlots(professionalId: number, date: string) {
    const settings = await this.r.settings.get();
    const target = new Date(date);
    if (Number.isNaN(target.getTime())) throw conflict('Data inválida');
    const { dayOfWeek, minutesOfDay } = zonedDayAndMinutes(target, settings.timezone);
    const slots = (await this.r.availabilities.findByProfessionalId(professionalId)).filter(
      (slot) => slot.active && slot.dayOfWeek === dayOfWeek,
    );
    const appointments = await this.r.appointments.findByProfessionalAndRange(
      professionalId,
      new Date(target.getTime() - 86_400_000),
      new Date(target.getTime() + 86_400_000),
    );
    const blocks = await this.r.blocks.findByProfessionalAndRange(
      professionalId,
      new Date(target.getTime() - 86_400_000),
      new Date(target.getTime() + 86_400_000),
    );
    const dateOnly = new Intl.DateTimeFormat('en-CA', {
      timeZone: settings.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(target);
    const result = [];
    for (const slot of slots) {
      const startMinutes = timeToMinutes(slot.startTime);
      const endMinutes = timeToMinutes(slot.endTime);
      for (
        let minutes = Math.max(startMinutes, minutesOfDay);
        minutes + slot.durationMinutes <= endMinutes;
        minutes += slot.durationMinutes
      ) {
        const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
        const mins = String(minutes % 60).padStart(2, '0');
        const candidate = dateAtTimeZone(dateOnly, `${hours}:${mins}`, settings.timezone);
        if (candidate.getTime() <= Date.now()) continue;
        const candidateEnd = new Date(candidate.getTime() + slot.durationMinutes * 60_000);
        const busy = appointments.some(
          (item) =>
            activeAppointmentStatuses.includes(item.status) &&
            overlaps(candidate, candidateEnd, new Date(item.dateTime), item.durationMinutes),
        );
        const blocked = blocks.some(
          (block) =>
            block.active &&
            overlaps(
              candidate,
              candidateEnd,
              new Date(block.startsAt),
              (new Date(block.endsAt).getTime() - new Date(block.startsAt).getTime()) / 60_000,
            ),
        );
        if (!busy && !blocked)
          result.push({ dateTime: candidate.toISOString(), durationMinutes: slot.durationMinutes });
      }
    }
    return [...new Map(result.map((item) => [item.dateTime, item])).values()].sort((a, b) =>
      a.dateTime.localeCompare(b.dateTime),
    );
  }

  async reschedule(id: number, newDateTime: string, patientId: number) {
    return this.r.transaction((repos) =>
      new SchedulingService(repos).rescheduleSteps(id, newDateTime, patientId),
    );
  }
  /** Passos de `reschedule`; sempre executados dentro de uma transação. */
  private async rescheduleSteps(id: number, newDateTime: string, patientId: number) {
    const appointment = await this.r.appointments.findById(id);
    if (!appointment) {
      throw notFound('Consulta não encontrada');
    }
    if (patientId && appointment.patientId !== patientId) {
      throw forbidden('A consulta não pertence ao paciente autenticado');
    }
    if (!allowedReschedule.includes(appointment.status)) {
      throw conflict('Consulta não pode ser remarcada neste estado');
    }
    const start = new Date(newDateTime);
    if (Number.isNaN(start.getTime())) {
      throw conflict('Data/hora inválida');
    }
    if (start.getTime() <= Date.now()) {
      throw conflict('Não é permitido remarcar para o passado');
    }
    const end = new Date(start.getTime() + appointment.durationMinutes * 60_000);
    await this.ensureAvailable(appointment.professionalId, start, end, appointment.durationMinutes);
    await this.ensureAppointmentConflict(appointment.professionalId, start, end, appointment.id);
    await this.ensureBlockConflict(appointment.professionalId, start, end);
    const updated = await this.r.appointments.update(appointment.id, {
      dateTime: newDateTime,
      status: 'AGENDADA',
      updatedAt: nowIso(),
    });
    await this.createAppointmentNotification(
      updated,
      `Sua consulta foi remarcada para ${formatDateTimeBR(newDateTime)}.`,
    );
    return updated;
  }
  async cancel(id: number, reason: string, patientId: number) {
    return this.r.transaction((repos) => new SchedulingService(repos).cancelSteps(id, reason, patientId));
  }
  /** Passos de `cancel`; sempre executados dentro de uma transação. */
  private async cancelSteps(id: number, reason: string, patientId: number) {
    const appointment = await this.r.appointments.findById(id);
    if (!appointment) {
      throw notFound('Consulta não encontrada');
    }
    if (patientId && appointment.patientId !== patientId) {
      throw forbidden('A consulta não pertence ao paciente autenticado');
    }
    if (
      appointment.status === 'REALIZADA' ||
      appointment.status === 'CANCELADA' ||
      appointment.status === 'FALTA'
    ) {
      throw conflict('Consulta não pode ser cancelada');
    }
    const updated = await this.r.appointments.update(id, {
      status: 'CANCELADA',
      cancellationReason: reason,
      updatedAt: nowIso(),
    });
    await this.createAppointmentNotification(updated, `Sua consulta foi cancelada. Motivo: ${reason}`);
    return updated;
  }
  async confirm(id: number, patientId: number) {
    const appointment = await this.r.appointments.findById(id);
    if (!appointment) {
      throw notFound('Consulta não encontrada');
    }
    if (appointment.patientId !== patientId) {
      throw forbidden('A consulta não pertence ao paciente autenticado');
    }
    if (!['AGENDADA', 'CONFIRMADA'].includes(appointment.status)) {
      throw conflict('Consulta não pode ser confirmada');
    }
    return this.r.appointments.update(id, {
      status: 'CONFIRMADA',
      confirmedAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
  async ensureAvailable(professionalId: number, start: Date, end: Date, durationMinutes: number) {
    const settings = await this.r.settings.get();
    const { dayOfWeek, minutesOfDay } = zonedDayAndMinutes(start, settings.timezone);
    const endLocal = zonedDayAndMinutes(end, settings.timezone);
    if (endLocal.dayOfWeek !== dayOfWeek) {
      throw conflict('O horário solicitado ultrapassa o dia de disponibilidade');
    }
    const availabilities = await this.r.availabilities.findByProfessionalId(professionalId);
    const activeAvailabilities = availabilities.filter((slot) => slot.active && slot.dayOfWeek === dayOfWeek);
    if (activeAvailabilities.length === 0) {
      throw conflict('O profissional não possui disponibilidade para este dia');
    }
    const appointmentEndMinutes = endLocal.minutesOfDay;
    const fitsAvailability = activeAvailabilities.some((slot) => {
      const availabilityStart = timeToMinutes(slot.startTime);
      const availabilityEnd = timeToMinutes(slot.endTime);
      return (
        minutesOfDay >= availabilityStart &&
        appointmentEndMinutes <= availabilityEnd &&
        durationMinutes <= slot.durationMinutes
      );
    });
    if (!fitsAvailability) {
      throw conflict('O horário solicitado está fora da disponibilidade do profissional');
    }
  }
  async ensureAppointmentConflict(
    professionalId: number,
    start: Date,
    end: Date,
    ignoredAppointmentId?: number,
  ) {
    const appointments = await this.r.appointments.findByProfessionalAndRange(
      professionalId,
      new Date(start.getTime() - 86_400_000),
      new Date(end.getTime() + 86_400_000),
    );
    const hasConflict = appointments.some((appointment) => {
      if (ignoredAppointmentId && appointment.id === ignoredAppointmentId) {
        return false;
      }
      if (!activeAppointmentStatuses.includes(appointment.status)) {
        return false;
      }
      return overlaps(start, end, new Date(appointment.dateTime), appointment.durationMinutes);
    });
    if (hasConflict) {
      throw conflict('Horário ocupado');
    }
  }
  async ensureBlockConflict(professionalId: number, start: Date, end: Date) {
    const blocks = await this.r.blocks.findByProfessionalAndRange(
      professionalId,
      new Date(start.getTime() - 86_400_000),
      new Date(end.getTime() + 86_400_000),
    );
    const hasConflict = blocks.some((block) => {
      if (!block.active) {
        return false;
      }
      const blockStart = new Date(block.startsAt);
      const blockEnd = new Date(block.endsAt);
      if (Number.isNaN(blockStart.getTime()) || Number.isNaN(blockEnd.getTime()) || blockStart >= blockEnd) {
        return false;
      }
      return overlaps(start, end, blockStart, (blockEnd.getTime() - blockStart.getTime()) / 60_000);
    });
    if (hasConflict) {
      throw conflict('Período bloqueado');
    }
  }
  async createAppointmentNotification(appointment: Appointment, content: string) {
    const createdAt = nowIso();
    const patient = await this.r.patients.findById(appointment.patientId);
    const patientUserId = patient?.userId;
    const base: Omit<Notification, 'id' | 'channel'> = {
      patientId: appointment.patientId,
      userId: patientUserId,
      appointmentId: appointment.id,
      type: 'CONSULTA',
      content,
      status: 'PENDENTE',
      attempts: 0,
      createdAt,
    };
    await this.r.notifications.create({ channel: 'WHATSAPP', ...base });
    await this.r.notifications.create({ channel: 'EMAIL', ...base });

    // Aviso interno somente para o profissional responsável pela consulta.
    // Pacientes recebem os canais vinculados ao próprio cadastro acima.
    // Administradores/master não recebem notificações clínicas de terceiros.
    const professional = await this.r.professionals.findById(appointment.professionalId);
    if (professional?.userId) {
      await this.r.notifications.create({
        userId: professional.userId,
        appointmentId: appointment.id,
        type: 'CONSULTA',
        channel: 'IN_APP',
        content,
        status: 'ENVIADO',
        readAt: undefined,
        sentAt: createdAt,
        attempts: 0,
        createdAt,
      });
    }
  }
}
