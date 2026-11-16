process.env.NODE_ENV = 'test';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { buildApp } from '../src/app.js';
import { createRepositories } from '../src/infrastructure/repositories/InMemoryRepositories.js';
import { seed } from '../src/infrastructure/bootstrap.js';
import { BcryptPasswordHasher } from '../src/infrastructure/crypto/PasswordHasher.js';
import { ReminderJob } from '../src/infrastructure/scheduler/ReminderJob.js';
import type { NotificationGateway } from '../src/infrastructure/gateways/NotificationGateways.js';
import { ReportService } from '../src/application/services/ReportService.js';
import { ProfessionalService } from '../src/application/services/ProfessionalService.js';
import { formatDateTimeBR } from '../src/application/services/dateFormat.js';
import type { Repositories } from '../src/domain/repositories/contracts.js';
import type { Appointment, AppointmentStatus, SystemSettings } from '../src/domain/entities/types.js';

/**
 * US004 (lembretes), US018 (relatório de faltas) e US019 (relatório de produtividade).
 * Usam os repositórios em memória diretamente para controlar datas no passado,
 * que a API corretamente não permite criar.
 */

const PASSWORD = process.env.SEED_PASSWORD ?? 'ChangeMe123!';
const DEMO_CLINIC_ID = 2; // "HealthSync Clínica Demo"
const OTHER_CLINIC_ID = 3; // "Clínica Saúde Integrada"
const HOUR = 60 * 60 * 1000;

const settings: SystemSettings = {
  id: 1,
  systemName: 'HealthSync',
  timezone: 'America/Sao_Paulo',
  language: 'pt-BR',
  dateFormat: 'DD/MM/YYYY',
  sessionTimeoutMinutes: 60,
  logRetentionDays: 90,
  minPasswordLength: 8,
  mfaRequired: false,
  primaryColor: '#234B65',
  theme: 'light',
  compactMode: false,
  smtp: { host: '', port: 587, tls: true, user: '', password: '' },
  updatedAt: new Date().toISOString(),
};

type Context = {
  repos: Repositories;
  patientId: number;
  professionalId: number;
  otherProfessionalId: number;
  specialtyId: number;
};

async function setup(): Promise<Context> {
  const repos = createRepositories(settings);
  await seed(repos, new BcryptPasswordHasher(), PASSWORD);

  const patientUser = await repos.users.findByEmail('joaopedro@email.com');
  const professionalUser = await repos.users.findByEmail('carlos.matos@healthsync.local');
  assert.ok(patientUser && professionalUser, 'usuários do seed não encontrados');
  const patient = await repos.patients.findByUserId(patientUser.id);
  const professional = await repos.professionals.findByUserId(professionalUser.id);
  assert.ok(patient && professional, 'perfis do seed não encontrados');
  const otherProfessional = (await repos.professionals.list()).find((item) => item.id !== professional.id);
  assert.ok(otherProfessional, 'o seed deve ter mais de um profissional');
  const specialtyId = professional.specialties[0];
  assert.ok(specialtyId, 'o profissional do seed deve ter especialidade');

  return {
    repos,
    patientId: patient.id,
    professionalId: professional.id,
    otherProfessionalId: otherProfessional.id,
    specialtyId,
  };
}

async function addAppointment(
  ctx: Context,
  offsetMs: number,
  status: AppointmentStatus = 'AGENDADA',
  clinicId = DEMO_CLINIC_ID,
): Promise<Appointment> {
  const now = new Date().toISOString();
  return ctx.repos.appointments.create({
    clinicId,
    patientId: ctx.patientId,
    professionalId: ctx.professionalId,
    specialtyId: ctx.specialtyId,
    dateTime: new Date(Date.now() + offsetMs).toISOString(),
    durationMinutes: 30,
    type: 'PRESENCIAL',
    location: 'Consultório de teste',
    status,
    createdAt: now,
    updatedAt: now,
  });
}

function fakeGateway(channel: 'WHATSAPP' | 'EMAIL'): NotificationGateway {
  return { channel, send: async () => ({ success: true }) };
}

describe('US004 – lembretes automáticos', () => {
  test('cria um lembrete por canal para consultas nas próximas 24h, sem duplicar', async () => {
    const ctx = await setup();
    const soon = await addAppointment(ctx, 2 * HOUR);
    const cancelled = await addAppointment(ctx, 3 * HOUR, 'CANCELADA');
    const later = await addAppointment(ctx, 72 * HOUR);
    const job = new ReminderJob(ctx.repos, fakeGateway('WHATSAPP'), fakeGateway('EMAIL'), 60_000);

    await job.run();
    await job.run(); // segunda execução não pode repetir o lembrete

    const reminders = (await ctx.repos.notifications.findByPatientId(ctx.patientId)).filter(
      (item) => item.type === 'LEMBRETE',
    );
    const forSoon = reminders.filter((item) => item.appointmentId === soon.id);

    assert.deepEqual(forSoon.map((item) => item.channel).sort(), ['EMAIL', 'WHATSAPP']);
    for (const reminder of forSoon) {
      assert.equal(
        reminder.content,
        `Lembrete: sua consulta está agendada para ${formatDateTimeBR(soon.dateTime)}.`,
      );
      assert.doesNotMatch(reminder.content, /\d{1,2}:\d{2}:\d{2}/, 'lembrete não deve mostrar segundos');
    }
    assert.equal(reminders.filter((item) => item.appointmentId === cancelled.id).length, 0);
    assert.equal(reminders.filter((item) => item.appointmentId === later.id).length, 0);
  });
});

describe('US018 – registrar falta e relatório de faltas', () => {
  test('profissional registra falta só em consulta própria, já iniciada e sem atendimento', async () => {
    const ctx = await setup();
    const service = new ProfessionalService(ctx.repos);
    const past = await addAppointment(ctx, -2 * HOUR);
    const future = await addAppointment(ctx, 2 * HOUR);

    const updated = await service.markNoShow(ctx.professionalId, DEMO_CLINIC_ID, past.id);
    assert.equal(updated.status, 'FALTA');

    await assert.rejects(
      service.markNoShow(ctx.professionalId, DEMO_CLINIC_ID, past.id),
      /Somente consultas agendadas/,
    );
    await assert.rejects(
      service.markNoShow(ctx.professionalId, DEMO_CLINIC_ID, future.id),
      /antes do horário/,
    );
    await assert.rejects(
      service.markNoShow(ctx.otherProfessionalId, DEMO_CLINIC_ID, future.id),
      /não encontrada/,
    );
    await assert.rejects(
      service.markNoShow(ctx.professionalId, OTHER_CLINIC_ID, future.id),
      /não encontrada/,
    );
  });

  test('relatório de faltas mostra apenas as faltas da unidade do administrador', async () => {
    const ctx = await setup();
    const admin = new ReportService(ctx.repos);
    const absentHere = await addAppointment(ctx, -3 * HOUR, 'FALTA', DEMO_CLINIC_ID);
    const absentElsewhere = await addAppointment(ctx, -3 * HOUR, 'FALTA', OTHER_CLINIC_ID);
    await addAppointment(ctx, -3 * HOUR, 'REALIZADA', DEMO_CLINIC_ID);

    const from = new Date(Date.now() - 24 * HOUR).toISOString();
    const to = new Date().toISOString();
    const demo = await admin.absences(from, to, DEMO_CLINIC_ID);
    const other = await admin.absences(from, to, OTHER_CLINIC_ID);

    assert.deepEqual(
      demo.map((item) => item.id),
      [absentHere.id],
    );
    assert.deepEqual(
      other.map((item) => item.id),
      [absentElsewhere.id],
    );
    await assert.rejects(admin.absences(to, from, DEMO_CLINIC_ID), /Intervalo do relatório inválido/);
  });
});

describe('US019 – relatório de produtividade', () => {
  test('conta atendimentos e finalizados por profissional, somente na unidade do administrador', async () => {
    const ctx = await setup();
    const admin = new ReportService(ctx.repos);
    const now = new Date().toISOString();
    const statuses = ['FINALIZADO', 'EM_ANDAMENTO'] as const;
    for (const status of statuses) {
      const appointment = await addAppointment(ctx, -HOUR, 'REALIZADA', DEMO_CLINIC_ID);
      await ctx.repos.attendances.create({
        appointmentId: appointment.id,
        professionalId: ctx.professionalId,
        status,
        createdAt: now,
        updatedAt: now,
      });
    }
    // Atendimento do mesmo profissional em outra unidade não entra no relatório da Demo.
    const elsewhere = await addAppointment(ctx, -HOUR, 'REALIZADA', OTHER_CLINIC_ID);
    await ctx.repos.attendances.create({
      appointmentId: elsewhere.id,
      professionalId: ctx.professionalId,
      status: 'FINALIZADO',
      createdAt: now,
      updatedAt: now,
    });

    const from = new Date(Date.now() - 24 * HOUR).toISOString();
    const to = new Date(Date.now() + HOUR).toISOString();
    const rows = await admin.productivity(from, to, DEMO_CLINIC_ID);
    const row = rows.find((item) => item.professionalId === ctx.professionalId);

    assert.ok(row, 'o profissional da unidade deve aparecer no relatório');
    assert.equal(row.totalAttendances, 2);
    assert.equal(row.finished, 1);
    await assert.rejects(admin.productivity(to, from, DEMO_CLINIC_ID), /Intervalo do relatório inválido/);
  });

  test('rotas de relatório exigem perfil de administrador', async () => {
    const app = await buildApp();
    try {
      const from = new Date(Date.now() - 24 * HOUR).toISOString();
      const to = new Date().toISOString();
      const anonymous = await app.inject({
        method: 'GET',
        url: `/api/v1/admin/reports/productivity?from=${from}&to=${to}`,
      });
      assert.equal(anonymous.statusCode, 401, anonymous.body);

      const login = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'x-auth-mode': 'token' },
        payload: { email: 'admin@healthsync.local', password: PASSWORD },
      });
      assert.equal(login.statusCode, 200, login.body);
      const token = (login.json() as { accessToken: string }).accessToken;
      for (const report of ['productivity', 'absences']) {
        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/admin/reports/${report}?from=${from}&to=${to}`,
          headers: { authorization: `Bearer ${token}` },
        });
        assert.equal(response.statusCode, 200, response.body);
        assert.ok(Array.isArray((response.json() as { data: unknown[] }).data));
      }
    } finally {
      await app.close();
    }
  });
});
