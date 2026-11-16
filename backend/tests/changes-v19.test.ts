process.env.NODE_ENV = 'test';
import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.js';
import { formatDateTimeBR } from '../src/application/services/dateFormat.js';

/**
 * Testes de API das mudanças pedidas na avaliação:
 *  - notificações com apenas hora e minuto;
 *  - preferência de atendimento (idoso, gestante, pessoa com deficiência);
 *  - remarcar consulta (reaproveita a tela de agendar e a rota de remarcação);
 *  - salvar consulta na agenda / e-mail (convite .ics).
 */

type Session = { accessToken: string; user: { email: string; role: string; clinicId: number } };
type Appointment = {
  id: number;
  patientId: number;
  professionalId: number;
  specialtyId: number;
  dateTime: string;
  status: string;
};
type Notification = { id: number; appointmentId?: number; content: string };

const PASSWORD = process.env.SEED_PASSWORD ?? 'ChangeMe123!';
const PATIENT_EMAIL = 'joaopedro@email.com';
const OTHER_PATIENT_EMAIL = 'mariana.souza@saudeintegrada.local';
const PROFESSIONAL_EMAIL = 'carlos.matos@healthsync.local';
// Clínica "HealthSync Clínica Demo": 2º registro criado pelo seed (o 1º é a clínica do acesso global).
const CLINIC_ID = 2;

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

async function login(app: FastifyInstance, email: string): Promise<Session> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    headers: { 'x-auth-mode': 'token' },
    payload: { email, password: PASSWORD },
  });
  assert.equal(response.statusCode, 200, response.body);
  const body = response.json() as Session & { requiresClinicSelection?: boolean; selectionToken?: string };
  if (body.requiresClinicSelection) {
    const selection = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/professional/select-clinic',
      headers: { 'x-auth-mode': 'token' },
      payload: { selectionToken: body.selectionToken, clinicId: CLINIC_ID },
    });
    assert.equal(selection.statusCode, 200, selection.body);
    return selection.json() as Session;
  }
  return body;
}

function nextMondayAtUtc(hour: number, minute = 0): string {
  const now = new Date();
  const result = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0, 0),
  );
  let days = (1 - now.getUTCDay() + 7) % 7;
  if (days === 0) days = 7;
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString();
}

async function configureMondayAvailability(app: FastifyInstance, token: string) {
  const response = await app.inject({
    method: 'PUT',
    url: '/api/v1/professional/agenda/availability',
    headers: auth(token),
    payload: { slots: [{ dayOfWeek: 1, startTime: '08:00', endTime: '17:00', durationMinutes: 30 }] },
  });
  assert.equal(response.statusCode, 200, response.body);
}

async function referenceAppointment(app: FastifyInstance, token: string): Promise<Appointment> {
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/patient/appointments',
    headers: auth(token),
  });
  assert.equal(response.statusCode, 200, response.body);
  const list = (response.json() as { data: Appointment[] }).data;
  assert.ok(list[0], 'Nenhuma consulta de referência no seed');
  return list[0];
}

async function createAppointment(
  app: FastifyInstance,
  token: string,
  reference: Appointment,
  dateTime: string,
) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/patient/appointments',
    headers: auth(token),
    payload: {
      clinicId: CLINIC_ID,
      professionalId: reference.professionalId,
      specialtyId: reference.specialtyId,
      dateTime,
      durationMinutes: 30,
      type: 'PRESENCIAL',
      location: 'Consultório',
    },
  });
}

async function patientNotifications(app: FastifyInstance, token: string): Promise<Notification[]> {
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/patient/notifications',
    headers: auth(token),
  });
  assert.equal(response.statusCode, 200, response.body);
  return (response.json() as { data: Notification[] }).data;
}

async function agendaOfMonday(
  app: FastifyInstance,
  token: string,
): Promise<Array<Appointment & { patient?: { priorities?: string[] } }>> {
  const monday = new Date(nextMondayAtUtc(0));
  const from = new Date(monday.getTime() - 24 * 3600_000).toISOString();
  const to = new Date(monday.getTime() + 48 * 3600_000).toISOString();
  const response = await app.inject({
    method: 'GET',
    url: `/api/v1/professional/agenda?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    headers: auth(token),
  });
  assert.equal(response.statusCode, 200, response.body);
  return (response.json() as { data: Array<Appointment & { patient?: { priorities?: string[] } }> }).data;
}

const NO_SECONDS = /\d{1,2}:\d{2}:\d{2}/;

describe('Mudanças v19 (API)', { concurrency: false }, () => {
  test('formatDateTimeBR: fuso de São Paulo, só hora e minuto', () => {
    assert.equal(formatDateTimeBR('2026-11-20T17:30:45.000Z'), '20/11/2026 às 14:30');
    assert.equal(formatDateTimeBR('2026-11-20T03:05:00.000Z'), '20/11/2026 às 00:05');
    assert.equal(formatDateTimeBR('data inválida'), '');
  });

  test('notificações de agendamento e remarcação mostram apenas hora e minuto', async () => {
    const app = await buildApp();
    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);
      await configureMondayAvailability(app, professional.accessToken);
      const reference = await referenceAppointment(app, patient.accessToken);

      const created = await createAppointment(app, patient.accessToken, reference, nextMondayAtUtc(13));
      assert.equal(created.statusCode, 201, created.body);
      const appointment = created.json() as Appointment;

      const afterCreate = (await patientNotifications(app, patient.accessToken)).find(
        (item) => String(item.appointmentId) === String(appointment.id),
      );
      assert.ok(afterCreate, 'notificação de agendamento não encontrada');
      assert.match(afterCreate.content, /\d{2}\/\d{2}\/\d{4} às 10:00/);
      assert.doesNotMatch(afterCreate.content, NO_SECONDS);

      const rescheduled = await app.inject({
        method: 'PATCH',
        url: `/api/v1/patient/appointments/${appointment.id}/reschedule`,
        headers: auth(patient.accessToken),
        payload: { dateTime: nextMondayAtUtc(13, 30) },
      });
      assert.equal(rescheduled.statusCode, 200, rescheduled.body);

      const remarcada = (await patientNotifications(app, patient.accessToken)).find(
        (item) => String(item.appointmentId) === String(appointment.id) && /remarcada/i.test(item.content),
      );
      assert.ok(remarcada, 'notificação de remarcação não encontrada');
      assert.match(remarcada.content, /\d{2}\/\d{2}\/\d{4} às 10:30/);
      assert.doesNotMatch(remarcada.content, NO_SECONDS);
    } finally {
      await app.close();
    }
  });

  test('remarcar: horário ocupado é recusado e a consulta continua no horário original', async () => {
    const app = await buildApp();
    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);
      await configureMondayAvailability(app, professional.accessToken);
      const reference = await referenceAppointment(app, patient.accessToken);

      const first = (await createAppointment(app, patient.accessToken, reference, nextMondayAtUtc(14)).then(
        (r) => {
          assert.equal(r.statusCode, 201, r.body);
          return r.json();
        },
      )) as Appointment;
      const second = (await createAppointment(
        app,
        patient.accessToken,
        reference,
        nextMondayAtUtc(14, 30),
      ).then((r) => {
        assert.equal(r.statusCode, 201, r.body);
        return r.json();
      })) as Appointment;

      const conflict = await app.inject({
        method: 'PATCH',
        url: `/api/v1/patient/appointments/${second.id}/reschedule`,
        headers: auth(patient.accessToken),
        payload: { dateTime: first.dateTime },
      });
      assert.equal(conflict.statusCode, 409, conflict.body);

      const list = (await app
        .inject({ method: 'GET', url: '/api/v1/patient/appointments', headers: auth(patient.accessToken) })
        .then((r) => r.json())) as { data: Appointment[] };
      assert.equal(
        list.data.find((item) => String(item.id) === String(second.id))?.dateTime,
        second.dateTime,
      );
    } finally {
      await app.close();
    }
  });

  test('preferência: paciente salva (sem duplicar) e o profissional vê na agenda do dia', async () => {
    const app = await buildApp();
    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);
      await configureMondayAvailability(app, professional.accessToken);

      const saved = await app.inject({
        method: 'PATCH',
        url: '/api/v1/patient/profile',
        headers: auth(patient.accessToken),
        payload: { priorities: ['GESTANTE', 'IDOSO', 'GESTANTE'] },
      });
      assert.equal(saved.statusCode, 200, saved.body);
      assert.deepEqual((saved.json() as { priorities: string[] }).priorities, ['GESTANTE', 'IDOSO']);

      const profile = await app.inject({
        method: 'GET',
        url: '/api/v1/patient/profile',
        headers: auth(patient.accessToken),
      });
      assert.deepEqual((profile.json() as { priorities: string[] }).priorities, ['GESTANTE', 'IDOSO']);

      const reference = await referenceAppointment(app, patient.accessToken);
      const created = await createAppointment(app, patient.accessToken, reference, nextMondayAtUtc(15));
      assert.equal(created.statusCode, 201, created.body);
      const appointment = created.json() as Appointment;

      const agenda = await agendaOfMonday(app, professional.accessToken);
      const item = agenda.find((entry) => String(entry.id) === String(appointment.id));
      assert.ok(item, 'consulta não apareceu na agenda do profissional');
      assert.deepEqual(item.patient?.priorities, ['GESTANTE', 'IDOSO']);

      const cleared = await app.inject({
        method: 'PATCH',
        url: '/api/v1/patient/profile',
        headers: auth(patient.accessToken),
        payload: { priorities: [] },
      });
      assert.equal(cleared.statusCode, 200, cleared.body);
      assert.deepEqual((cleared.json() as { priorities: string[] }).priorities, []);
    } finally {
      await app.close();
    }
  });

  test('preferência: valor desconhecido é rejeitado', async () => {
    const app = await buildApp();
    try {
      const patient = await login(app, PATIENT_EMAIL);
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/patient/profile',
        headers: auth(patient.accessToken),
        payload: { priorities: ['VIP'] },
      });
      assert.equal(response.statusCode, 422, response.body);
    } finally {
      await app.close();
    }
  });

  test('agendamento público guarda a preferência, devolve o id e envia o convite', async () => {
    const app = await buildApp();
    const logged: string[] = [];
    const spy = mock.method(console, 'info', (...args: unknown[]) => {
      logged.push(args.map(String).join(' '));
    });
    try {
      const professional = await login(app, PROFESSIONAL_EMAIL);
      await configureMondayAvailability(app, professional.accessToken);
      const me = (await app
        .inject({ method: 'GET', url: '/api/v1/auth/me', headers: auth(professional.accessToken) })
        .then((r) => r.json())) as { profile: { id: number } };

      const catalog = (await app
        .inject({ method: 'GET', url: `/api/v1/public/catalog/professionals?clinicId=${CLINIC_ID}` })
        .then((r) => r.json())) as { data: Array<{ id: number; specialties: Array<string | number> }> };
      const entry = catalog.data.find((item) => String(item.id) === String(me.profile.id));
      assert.ok(entry && entry.specialties.length > 0, 'profissional não encontrado no catálogo público');

      const day = nextMondayAtUtc(10).slice(0, 10);
      const slots = (await app
        .inject({ method: 'GET', url: `/api/v1/public/availability?professionalId=${entry.id}&date=${day}` })
        .then((r) => r.json())) as { data: Array<{ dateTime: string; durationMinutes: number }> };
      const firstSlot = slots.data[0];
      assert.ok(firstSlot, 'sem horários livres no teste');

      const booking = await app.inject({
        method: 'POST',
        url: '/api/v1/public/appointments',
        payload: {
          clinicId: CLINIC_ID,
          professionalId: entry.id,
          specialtyId: entry.specialties[0],
          dateTime: firstSlot.dateTime,
          durationMinutes: firstSlot.durationMinutes,
          type: 'PRESENCIAL',
          location: 'Consultório',
          name: 'Paciente Prioritário de Teste',
          cpf: '11144477735',
          email: 'prioritario.teste@example.com',
          phone: '(11) 97777-2222',
          birthDate: '1950-03-10',
          gender: 'Feminino',
          priorities: ['PESSOA_COM_DEFICIENCIA'],
          lgpdConsentAccepted: true,
        },
      });
      assert.equal(booking.statusCode, 201, booking.body);
      const body = booking.json() as { appointment: { id?: number } };
      assert.ok(body.appointment.id !== undefined, 'a resposta deve trazer o id da consulta');

      const agenda = await agendaOfMonday(app, professional.accessToken);
      const item = agenda.find((entry2) => String(entry2.id) === String(body.appointment.id));
      assert.ok(item, 'consulta pública não apareceu na agenda');
      assert.deepEqual(item.patient?.priorities, ['PESSOA_COM_DEFICIENCIA']);

      // O e-mail é enviado em segundo plano; aguarda o ciclo de eventos.
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.ok(
        logged.some(
          (line) =>
            line.includes('prioritario.teste@example.com') && line.includes('consulta-healthsync.ics'),
        ),
        'convite com anexo .ics deveria ter sido enviado',
      );
    } finally {
      spy.mock.restore();
      await app.close();
    }
  });

  test('salvar na agenda por e-mail: dono recebe o .ics; sessão ausente, perfil errado e outra pessoa são recusados', async () => {
    const app = await buildApp();
    const logged: string[] = [];
    const spy = mock.method(console, 'info', (...args: unknown[]) => {
      logged.push(args.map(String).join(' '));
    });
    try {
      const patient = await login(app, PATIENT_EMAIL);
      const other = await login(app, OTHER_PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);
      await configureMondayAvailability(app, professional.accessToken);
      const reference = await referenceAppointment(app, patient.accessToken);
      const created = await createAppointment(app, patient.accessToken, reference, nextMondayAtUtc(16));
      assert.equal(created.statusCode, 201, created.body);
      const appointment = created.json() as Appointment;
      const url = `/api/v1/patient/appointments/${appointment.id}/calendar-email`;

      const ok = await app.inject({ method: 'POST', url, headers: auth(patient.accessToken) });
      assert.equal(ok.statusCode, 200, ok.body);
      const sent = ok.json() as { sent: boolean; email: string };
      assert.equal(sent.sent, true);
      assert.match(sent.email, /^jo\*+@email\.com$/, 'o e-mail deve voltar mascarado');
      assert.ok(
        logged.some((line) => line.includes('consulta-healthsync.ics')),
        'anexo .ics ausente',
      );
      assert.ok(
        !logged.some((line) => /Duração/i.test(line)),
        'o e-mail do paciente não deve mostrar a duração',
      );

      assert.equal((await app.inject({ method: 'POST', url })).statusCode, 401);
      assert.equal(
        (await app.inject({ method: 'POST', url, headers: auth(professional.accessToken) })).statusCode,
        403,
      );
      assert.equal(
        (await app.inject({ method: 'POST', url, headers: auth(other.accessToken) })).statusCode,
        404,
      );
      assert.equal(
        (
          await app.inject({
            method: 'POST',
            url: '/api/v1/patient/appointments/999999/calendar-email',
            headers: auth(patient.accessToken),
          })
        ).statusCode,
        404,
      );
    } finally {
      spy.mock.restore();
      await app.close();
    }
  });
});
