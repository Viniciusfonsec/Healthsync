import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.js';

type Session = {
  accessToken: string;
  user: {
    email: string;
    role: string;
    clinicId: number;
  };
};

type Appointment = {
  id: number;
  patientId: number;
  professionalId: number;
  specialtyId: number;
  dateTime: string;
  durationMinutes: number;
  status: string;
  clinicId?: number;
};

type Attendance = {
  id: number;
  appointmentId: number;
  professionalId: number;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  notes?: string;
  diagnosis?: string;
  prescription?: string;
};

const PASSWORD = process.env.SEED_PASSWORD ?? 'ChangeMe123!';

const PATIENT_EMAIL = 'joaopedro@email.com';
const PROFESSIONAL_EMAIL = 'carlos.matos@healthsync.local';
const MULTI_CLINIC_PROFESSIONAL_EMAIL = 'ana.ribeiro@saudeintegrada.local';
const ADMIN_EMAIL = 'admin@healthsync.local';
// Clínica "HealthSync Clínica Demo": 2º registro criado pelo seed (o 1º é a clínica do acesso global).
const CLINIC_ID = 2;

/** Gera um CPF válido (dígitos verificadores corretos) e diferente a cada chamada. */
let cpfSequence = 0;
function uniqueValidCpf(): string {
  const base = `${Date.now()}${cpfSequence++}`.slice(-9).padStart(9, '1').split('').map(Number);
  const digit = (numbers: number[]) => {
    const sum = numbers.reduce((total, n, index) => total + n * (numbers.length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const first = digit(base);
  const second = digit([...base, first]);
  return [...base, first, second].join('');
}

function auth(token: string) {
  return {
    authorization: `Bearer ${token}`,
  };
}

async function login(
  app: FastifyInstance,
  email: string,
  password = PASSWORD,
  clinicId = CLINIC_ID,
): Promise<Session> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    headers: { 'x-auth-mode': 'token' },
    payload: { email, password },
  });

  assert.equal(response.statusCode, 200, response.body);

  const body = response.json() as Session & {
    requiresClinicSelection?: boolean;
    selectionToken?: string;
  };

  if (body.requiresClinicSelection) {
    assert.ok(body.selectionToken);
    const selection = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/professional/select-clinic',
      headers: { 'x-auth-mode': 'token' },
      payload: {
        selectionToken: body.selectionToken,
        clinicId,
      },
    });

    assert.equal(selection.statusCode, 200, selection.body);
    return selection.json() as Session;
  }

  assert.ok(body.accessToken);
  assert.ok(body.user);
  return body;
}

function nextMondayAtUtc(hour: number, minute = 0): string {
  const now = new Date();

  const result = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0, 0),
  );

  let daysUntilMonday = (1 - now.getUTCDay() + 7) % 7;

  if (daysUntilMonday === 0) {
    daysUntilMonday = 7;
  }

  result.setUTCDate(result.getUTCDate() + daysUntilMonday);

  return result.toISOString();
}

function nextTuesdayAtUtc(hour: number, minute = 0): string {
  const monday = new Date(nextMondayAtUtc(hour, minute));

  monday.setUTCDate(monday.getUTCDate() + 1);

  return monday.toISOString();
}

async function configureMondayAvailability(app: FastifyInstance, professionalToken: string): Promise<void> {
  const response = await app.inject({
    method: 'PUT',
    url: '/api/v1/professional/agenda/availability',
    headers: auth(professionalToken),
    payload: {
      slots: [
        {
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '17:00',
          durationMinutes: 30,
        },
      ],
    },
  });

  assert.equal(response.statusCode, 200, response.body);
}

async function getPatientAppointments(app: FastifyInstance, patientToken: string): Promise<Appointment[]> {
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/patient/appointments',
    headers: auth(patientToken),
  });

  assert.equal(response.statusCode, 200, response.body);

  const body = response.json();

  if (Array.isArray(body)) {
    return body as Appointment[];
  }

  if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
    return (body as { data: Appointment[] }).data;
  }

  throw new Error(`Formato inesperado em /api/v1/patient/appointments: ${JSON.stringify(body)}`);
}

async function getReferenceAppointment(app: FastifyInstance, patientToken: string): Promise<Appointment> {
  const appointments = await getPatientAppointments(app, patientToken);

  const appointment = appointments[0];

  assert.ok(appointment, 'Nenhuma consulta de referência encontrada no seed');

  return appointment;
}

async function createAppointment(
  app: FastifyInstance,
  patientToken: string,
  professionalId: number,
  specialtyId: number,
  dateTime: string,
  clinicId = CLINIC_ID,
) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/patient/appointments',
    headers: auth(patientToken),
    payload: {
      clinicId,
      professionalId,
      specialtyId,
      dateTime,
      durationMinutes: 30,
      type: 'PRESENCIAL',
      location: 'Consultório 3 - Bloco A',
    },
  });
}

describe('HealthSync smoke suite', { concurrency: false }, () => {
  test('health endpoint', async () => {
    const app = await buildApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      assert.equal(response.statusCode, 200);

      const body = response.json() as {
        status: string;
        service?: string;
      };

      assert.equal(body.status, 'ok');
    } finally {
      await app.close();
    }
  });

  test('login and protected patient endpoint', async () => {
    const app = await buildApp();

    try {
      const session = await login(app, PATIENT_EMAIL);

      assert.ok(session.accessToken);
      assert.equal(session.user.role, 'PACIENTE');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patient/appointments',
        headers: auth(session.accessToken),
      });

      assert.equal(response.statusCode, 200, response.body);

      const appointments = await getPatientAppointments(app, session.accessToken);

      assert.ok(Array.isArray(appointments));
    } finally {
      await app.close();
    }
  });

  test('patient can schedule at another active clinic without prior clinic membership', async () => {
    const app = await buildApp();

    try {
      const admin = await login(app, ADMIN_EMAIL);
      const otherClinicId = 3; // "Clínica Saúde Integrada", 3º registro do seed

      const uniqueEmail = `paciente.multiclinica.${Date.now()}@healthsync.local`;
      const uniqueCpf = uniqueValidCpf();

      const createPatientResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/users/patients',
        headers: auth(admin.accessToken),
        payload: {
          name: 'Paciente Multiclínica',
          cpf: uniqueCpf,
          email: uniqueEmail,
          password: PASSWORD,
          phone: '11999999999',
          birthDate: '1995-01-01',
          gender: 'OUTRO',
        },
      });
      assert.equal(createPatientResponse.statusCode, 201, createPatientResponse.body);

      const patient = await login(app, uniqueEmail, PASSWORD);

      const professionalsResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/patient/catalog/professionals?clinicId=${encodeURIComponent(otherClinicId)}`,
        headers: auth(patient.accessToken),
      });
      assert.equal(professionalsResponse.statusCode, 200, professionalsResponse.body);

      const professionals = (
        professionalsResponse.json() as {
          data: { id: number; specialties: number[] }[];
        }
      ).data;
      const candidate = professionals.find((professional) => professional.specialties.length > 0);
      assert.ok(candidate, 'Deve existir profissional ativo na segunda clínica');

      const dateTime = nextMondayAtUtc(13, 0); // 10:00 em Brasília, dentro do expediente 08:00–17:00
      const response = await createAppointment(
        app,
        patient.accessToken,
        candidate.id,
        candidate.specialties[0]!, // garantido pelo find acima (specialties.length > 0)
        dateTime,
        otherClinicId,
      );

      assert.equal(response.statusCode, 201, response.body);
    } finally {
      await app.close();
    }
  });

  test('RBAC rejects patient access to admin routes', async () => {
    const app = await buildApp();

    try {
      const session = await login(app, PATIENT_EMAIL);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/dashboard',
        headers: auth(session.accessToken),
      });

      assert.equal(response.statusCode, 403);

      const body = response.json() as {
        error?: {
          code?: string;
          message?: string;
        };
      };

      assert.equal(body.error?.code, 'FORBIDDEN');
      assert.equal(body.error?.message, 'Acesso negado');
    } finally {
      await app.close();
    }
  });

  test('invalid login is rejected', async () => {
    const app = await buildApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'x-auth-mode': 'token' },
        payload: {
          email: PATIENT_EMAIL,
          password: 'senha-invalida',
        },
      });

      assert.equal(response.statusCode, 401);
    } finally {
      await app.close();
    }
  });

  test('US001: creates appointment inside professional availability', async () => {
    const app = await buildApp();

    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);

      await configureMondayAvailability(app, professional.accessToken);

      const reference = await getReferenceAppointment(app, patient.accessToken);

      const response = await createAppointment(
        app,
        patient.accessToken,
        reference.professionalId,
        reference.specialtyId,
        nextMondayAtUtc(13),
      );

      assert.equal(response.statusCode, 201, response.body);

      const appointment = response.json() as Appointment;

      assert.equal(appointment.status, 'AGENDADA');
      assert.equal(appointment.durationMinutes, 30);
      assert.equal(appointment.professionalId, reference.professionalId);
      assert.equal(appointment.specialtyId, reference.specialtyId);
    } finally {
      await app.close();
    }
  });

  test('US001: rejects appointment on unavailable weekday', async () => {
    const app = await buildApp();

    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);

      await configureMondayAvailability(app, professional.accessToken);

      const reference = await getReferenceAppointment(app, patient.accessToken);

      const response = await createAppointment(
        app,
        patient.accessToken,
        reference.professionalId,
        reference.specialtyId,
        nextTuesdayAtUtc(13),
      );

      assert.equal(response.statusCode, 409);

      const body = response.json() as {
        error?: {
          code?: string;
          message?: string;
        };
      };

      assert.equal(body.error?.code, 'CONFLICT');

      assert.match(body.error?.message ?? '', /não possui disponibilidade para este dia/i);
    } finally {
      await app.close();
    }
  });

  test('US001: rejects overlapping appointment', async () => {
    const app = await buildApp();

    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);

      await configureMondayAvailability(app, professional.accessToken);

      const reference = await getReferenceAppointment(app, patient.accessToken);

      const dateTime = nextMondayAtUtc(13);

      const first = await createAppointment(
        app,
        patient.accessToken,
        reference.professionalId,
        reference.specialtyId,
        dateTime,
      );

      assert.equal(first.statusCode, 201, first.body);

      const second = await createAppointment(
        app,
        patient.accessToken,
        reference.professionalId,
        reference.specialtyId,
        dateTime,
      );

      assert.equal(second.statusCode, 409);

      const body = second.json() as {
        error?: {
          code?: string;
          message?: string;
        };
      };

      assert.equal(body.error?.code, 'CONFLICT');
      assert.equal(body.error?.message, 'Horário ocupado');
    } finally {
      await app.close();
    }
  });

  test('US001: rejects appointment outside availability window', async () => {
    const app = await buildApp();

    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);

      await configureMondayAvailability(app, professional.accessToken);

      const reference = await getReferenceAppointment(app, patient.accessToken);

      const response = await createAppointment(
        app,
        patient.accessToken,
        reference.professionalId,
        reference.specialtyId,
        nextMondayAtUtc(20),
      );

      assert.equal(response.statusCode, 409);

      const body = response.json() as {
        error?: {
          code?: string;
          message?: string;
        };
      };

      assert.equal(body.error?.code, 'CONFLICT');

      assert.equal(body.error?.message, 'O horário solicitado está fora da disponibilidade do profissional');
    } finally {
      await app.close();
    }
  });

  test('US012: blocks agenda and prevents appointment in blocked period', async () => {
    const app = await buildApp();

    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);

      await configureMondayAvailability(app, professional.accessToken);

      const reference = await getReferenceAppointment(app, patient.accessToken);

      const blockResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/professional/agenda/blocks',
        headers: auth(professional.accessToken),
        payload: {
          startsAt: nextMondayAtUtc(15),
          endsAt: nextMondayAtUtc(16),
          reason: 'Bloqueio para teste',
        },
      });

      assert.equal(blockResponse.statusCode, 201);

      const appointmentResponse = await createAppointment(
        app,
        patient.accessToken,
        reference.professionalId,
        reference.specialtyId,
        nextMondayAtUtc(15),
      );

      assert.equal(appointmentResponse.statusCode, 409);

      const body = appointmentResponse.json() as {
        error?: {
          code?: string;
          message?: string;
        };
      };

      assert.equal(body.error?.code, 'CONFLICT');
      assert.equal(body.error?.message, 'Período bloqueado');
    } finally {
      await app.close();
    }
  });

  test('US002: reschedules appointment to a free slot', async () => {
    const app = await buildApp();

    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);

      await configureMondayAvailability(app, professional.accessToken);

      const reference = await getReferenceAppointment(app, patient.accessToken);

      const appointmentResponse = await createAppointment(
        app,
        patient.accessToken,
        reference.professionalId,
        reference.specialtyId,
        nextMondayAtUtc(13),
      );

      assert.equal(appointmentResponse.statusCode, 201);

      const appointment = appointmentResponse.json() as Appointment;

      const newDateTime = nextMondayAtUtc(13, 30);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/patient/appointments/${appointment.id}/reschedule`,
        headers: auth(patient.accessToken),
        payload: {
          dateTime: newDateTime,
        },
      });

      assert.equal(response.statusCode, 200);

      const updated = response.json() as Appointment;

      assert.equal(updated.id, appointment.id);
      assert.equal(updated.dateTime, newDateTime);
      assert.equal(updated.status, 'AGENDADA');
    } finally {
      await app.close();
    }
  });

  test('US002: rejects reschedule to occupied slot', async () => {
    const app = await buildApp();

    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);

      await configureMondayAvailability(app, professional.accessToken);

      const patientAppointments = await app.inject({
        method: 'GET',
        url: '/api/v1/patient/appointments',
        headers: auth(patient.accessToken),
      });

      const existing = patientAppointments.json().data[0] as Appointment;

      const firstDate = nextMondayAtUtc(13);
      const secondDate = nextMondayAtUtc(13, 30);

      const first = await createAppointment(
        app,
        patient.accessToken,
        existing.professionalId,
        existing.specialtyId,
        firstDate,
      );

      const second = await createAppointment(
        app,
        patient.accessToken,
        existing.professionalId,
        existing.specialtyId,
        secondDate,
      );

      assert.equal(first.statusCode, 201, first.body);
      assert.equal(second.statusCode, 201, second.body);

      const firstAppointment = first.json() as Appointment;

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/patient/appointments/${firstAppointment.id}/reschedule`,
        headers: auth(patient.accessToken),
        payload: {
          dateTime: secondDate,
        },
      });

      assert.equal(response.statusCode, 409, response.body);

      const body = response.json() as {
        error?: {
          code?: string;
          message?: string;
        };
        message?: string;
      };

      assert.equal(body.error?.code, 'CONFLICT');

      assert.equal(body.error?.message ?? body.message, 'Horário ocupado');
    } finally {
      await app.close();
    }
  });

  test('US003: cancels appointment and prevents duplicate cancellation', async () => {
    const app = await buildApp();

    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);

      await configureMondayAvailability(app, professional.accessToken);

      const reference = await getReferenceAppointment(app, patient.accessToken);

      const createResponse = await createAppointment(
        app,
        patient.accessToken,
        reference.professionalId,
        reference.specialtyId,
        nextMondayAtUtc(13),
      );

      assert.equal(createResponse.statusCode, 201);

      const appointment = createResponse.json() as Appointment;

      const firstCancel = await app.inject({
        method: 'POST',
        url: `/api/v1/patient/appointments/${appointment.id}/cancel`,
        headers: auth(patient.accessToken),
        payload: {
          reason: 'Teste de cancelamento',
        },
      });

      assert.equal(firstCancel.statusCode, 200);

      const canceled = firstCancel.json() as Appointment;

      assert.equal(canceled.status, 'CANCELADA');

      const secondCancel = await app.inject({
        method: 'POST',
        url: `/api/v1/patient/appointments/${appointment.id}/cancel`,
        headers: auth(patient.accessToken),
        payload: {
          reason: 'Tentativa duplicada',
        },
      });

      assert.equal(secondCancel.statusCode, 409);

      const body = secondCancel.json() as {
        error?: {
          code?: string;
          message?: string;
        };
      };

      assert.equal(body.error?.code, 'CONFLICT');

      assert.equal(body.error?.message, 'Consulta não pode ser cancelada');
    } finally {
      await app.close();
    }
  });

  test('US014: patient can confirm own appointment', async () => {
    const app = await buildApp();

    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);

      await configureMondayAvailability(app, professional.accessToken);

      const reference = await getReferenceAppointment(app, patient.accessToken);

      const createResponse = await createAppointment(
        app,
        patient.accessToken,
        reference.professionalId,
        reference.specialtyId,
        nextMondayAtUtc(13),
      );

      assert.equal(createResponse.statusCode, 201);

      const appointment = createResponse.json() as Appointment;

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/patient/appointments/${appointment.id}/confirm`,
        headers: auth(patient.accessToken),
      });

      assert.equal(response.statusCode, 200);

      const confirmed = response.json() as Appointment;

      assert.equal(confirmed.id, appointment.id);
      assert.equal(confirmed.status, 'CONFIRMADA');
    } finally {
      await app.close();
    }
  });

  test('US014: patient cannot confirm another patient appointment', async () => {
    const app = await buildApp();

    try {
      const firstPatient = await login(app, PATIENT_EMAIL);

      const reference = await getReferenceAppointment(app, firstPatient.accessToken);

      const admin = await login(app, ADMIN_EMAIL);

      const uniqueEmail = `teste.outro.paciente.${Date.now()}@healthsync.local`;

      const createPatientResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/users/patients',
        headers: auth(admin.accessToken),
        payload: {
          name: 'Paciente Teste',
          cpf: uniqueValidCpf(),
          email: uniqueEmail,
          password: PASSWORD,
          phone: '11999999999',
          birthDate: '1995-01-01',
          gender: 'OUTRO',
        },
      });

      assert.equal(createPatientResponse.statusCode, 201);

      const anotherPatient = await login(app, uniqueEmail, PASSWORD);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/patient/appointments/${reference.id}/confirm`,
        headers: auth(anotherPatient.accessToken),
      });

      assert.equal(response.statusCode, 403);

      const body = response.json() as {
        error?: {
          code?: string;
          message?: string;
        };
      };

      assert.equal(body.error?.code, 'FORBIDDEN');

      assert.equal(body.error?.message, 'A consulta não pertence ao paciente autenticado');
    } finally {
      await app.close();
    }
  });

  test('US013: professional can configure consultation duration', async () => {
    const app = await buildApp();

    try {
      const professional = await login(app, PROFESSIONAL_EMAIL);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/professional/settings/duration',
        headers: auth(professional.accessToken),
        payload: {
          minutes: 45,
        },
      });

      assert.equal(response.statusCode, 200);

      const body = response.json() as {
        consultationDurationMinutes: number;
      };

      assert.equal(body.consultationDurationMinutes, 45);
    } finally {
      await app.close();
    }
  });

  test('US006: professional starts attendance in ABERTO', async () => {
    const app = await buildApp();

    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);

      await configureMondayAvailability(app, professional.accessToken);

      const reference = await getReferenceAppointment(app, patient.accessToken);

      const appointmentResponse = await createAppointment(
        app,
        patient.accessToken,
        reference.professionalId,
        reference.specialtyId,
        nextMondayAtUtc(13),
      );

      assert.equal(appointmentResponse.statusCode, 201, appointmentResponse.body);

      const appointment = appointmentResponse.json() as Appointment;

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/professional/appointments/${appointment.id}/attendance`,
        headers: auth(professional.accessToken),
        payload: {
          notes: 'Atendimento iniciado para teste',
        },
      });

      assert.equal(response.statusCode, 201, response.body);

      const attendance = response.json() as Attendance;

      assert.equal(attendance.appointmentId, appointment.id);

      assert.equal(attendance.professionalId, reference.professionalId);

      assert.equal(attendance.status, 'ABERTO');

      assert.ok(attendance.startedAt);

      assert.equal(attendance.finishedAt ?? null, null);
    } finally {
      await app.close();
    }
  });

  test('US017: updates attendance from ABERTO to EM_ANDAMENTO and FINALIZADO', async () => {
    const app = await buildApp();

    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);

      await configureMondayAvailability(app, professional.accessToken);

      const reference = await getReferenceAppointment(app, patient.accessToken);

      const appointmentResponse = await createAppointment(
        app,
        patient.accessToken,
        reference.professionalId,
        reference.specialtyId,
        nextMondayAtUtc(13, 30),
      );

      assert.equal(appointmentResponse.statusCode, 201, appointmentResponse.body);

      const appointment = appointmentResponse.json() as Appointment;

      const createAttendanceResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/professional/appointments/${appointment.id}/attendance`,
        headers: auth(professional.accessToken),
        payload: {},
      });

      assert.equal(createAttendanceResponse.statusCode, 201, createAttendanceResponse.body);

      const attendance = createAttendanceResponse.json() as Attendance;

      assert.equal(attendance.status, 'ABERTO');

      const progressResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/professional/attendances/${attendance.id}/status`,
        headers: auth(professional.accessToken),
        payload: {
          status: 'EM_ANDAMENTO',
        },
      });

      assert.equal(progressResponse.statusCode, 200, progressResponse.body);

      const progress = progressResponse.json() as Attendance;

      assert.equal(progress.status, 'EM_ANDAMENTO');

      const finishResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/professional/attendances/${attendance.id}/status`,
        headers: auth(professional.accessToken),
        payload: {
          status: 'FINALIZADO',
        },
      });

      assert.equal(finishResponse.statusCode, 200, finishResponse.body);

      const finished = finishResponse.json() as Attendance;

      assert.equal(finished.status, 'FINALIZADO');

      assert.ok(finished.finishedAt);

      const patientAppointments = await getPatientAppointments(app, patient.accessToken);

      const updatedAppointment = patientAppointments.find((item) => item.id === appointment.id);

      assert.ok(updatedAppointment);

      assert.equal(updatedAppointment.status, 'REALIZADA');
    } finally {
      await app.close();
    }
  });

  test('US017: rejects invalid attendance transition', async () => {
    const app = await buildApp();

    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);

      await configureMondayAvailability(app, professional.accessToken);

      const reference = await getReferenceAppointment(app, patient.accessToken);

      const appointmentResponse = await createAppointment(
        app,
        patient.accessToken,
        reference.professionalId,
        reference.specialtyId,
        nextMondayAtUtc(15),
      );

      assert.equal(appointmentResponse.statusCode, 201, appointmentResponse.body);

      const appointment = appointmentResponse.json() as Appointment;

      const createAttendanceResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/professional/appointments/${appointment.id}/attendance`,
        headers: auth(professional.accessToken),
        payload: {},
      });

      assert.equal(createAttendanceResponse.statusCode, 201, createAttendanceResponse.body);

      const attendance = createAttendanceResponse.json() as Attendance;

      assert.equal(attendance.status, 'ABERTO');

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/professional/attendances/${attendance.id}/status`,
        headers: auth(professional.accessToken),
        payload: {
          status: 'FINALIZADO',
        },
      });

      assert.equal(response.statusCode, 409, response.body);

      const body = response.json() as {
        error?: {
          code?: string;
          message?: string;
        };
      };

      assert.equal(body.error?.code, 'CONFLICT');

      assert.equal(body.error?.message, 'Transição inválida: ABERTO -> FINALIZADO');
    } finally {
      await app.close();
    }
  });

  test('US006: rejects duplicate attendance for same appointment', async () => {
    const app = await buildApp();

    try {
      const patient = await login(app, PATIENT_EMAIL);
      const professional = await login(app, PROFESSIONAL_EMAIL);

      await configureMondayAvailability(app, professional.accessToken);

      const reference = await getReferenceAppointment(app, patient.accessToken);

      const appointmentResponse = await createAppointment(
        app,
        patient.accessToken,
        reference.professionalId,
        reference.specialtyId,
        nextMondayAtUtc(15, 30),
      );

      assert.equal(appointmentResponse.statusCode, 201, appointmentResponse.body);

      const appointment = appointmentResponse.json() as Appointment;

      const firstAttendance = await app.inject({
        method: 'POST',
        url: `/api/v1/professional/appointments/${appointment.id}/attendance`,
        headers: auth(professional.accessToken),
        payload: {},
      });

      assert.equal(firstAttendance.statusCode, 201, firstAttendance.body);

      const secondAttendance = await app.inject({
        method: 'POST',
        url: `/api/v1/professional/appointments/${appointment.id}/attendance`,
        headers: auth(professional.accessToken),
        payload: {},
      });

      assert.equal(secondAttendance.statusCode, 409, secondAttendance.body);

      const body = secondAttendance.json() as {
        error?: {
          code?: string;
          message?: string;
        };
      };

      assert.equal(body.error?.code, 'CONFLICT');

      assert.equal(body.error?.message, 'Atendimento já registrado');
    } finally {
      await app.close();
    }
  });

  test('security: patients authenticate without a clinic and professionals select a work clinic after authentication', async () => {
    const app = await buildApp();

    try {
      const patient = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'x-auth-mode': 'token' },
        payload: {
          email: PATIENT_EMAIL,
          password: PASSWORD,
        },
      });

      assert.equal(patient.statusCode, 200, patient.body);
      assert.ok(patient.json().accessToken);

      const professional = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'x-auth-mode': 'token' },
        payload: {
          email: PROFESSIONAL_EMAIL,
          password: PASSWORD,
        },
      });

      assert.equal(professional.statusCode, 200, professional.body);
      const challenge = professional.json() as {
        requiresClinicSelection: boolean;
        selectionToken: string;
        clinics: { id: number; name: string }[];
      };

      assert.equal(challenge.requiresClinicSelection, true);
      assert.ok(challenge.selectionToken);
      assert.ok(challenge.clinics.some((clinic) => clinic.id === CLINIC_ID));

      const selected = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/professional/select-clinic',
        headers: { 'x-auth-mode': 'token' },
        payload: {
          selectionToken: challenge.selectionToken,
          clinicId: CLINIC_ID,
        },
      });

      assert.equal(selected.statusCode, 200, selected.body);
      assert.equal(selected.json().user.clinicId, CLINIC_ID);

      const invalidSelection = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/professional/select-clinic',
        headers: { 'x-auth-mode': 'token' },
        payload: {
          selectionToken: challenge.selectionToken,
          clinicId: 999999,
        },
      });

      assert.equal(invalidSelection.statusCode, 403, invalidSelection.body);
    } finally {
      await app.close();
    }
  });

  test('professional agenda is scoped to the selected work clinic', async () => {
    const app = await buildApp();

    try {
      const first = await login(app, MULTI_CLINIC_PROFESSIONAL_EMAIL, PASSWORD, CLINIC_ID);
      const second = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/professional/switch-clinic',
        headers: auth(first.accessToken),
        payload: { clinicId: 3 },
      });

      assert.equal(second.statusCode, 200, second.body);
      const secondSession = second.json() as Session;

      const from = new Date('2026-10-05T00:00:00.000Z');
      const to = new Date('2026-10-06T00:00:00.000Z');

      const selectedClinicAgenda = await app.inject({
        method: 'GET',
        url: `/api/v1/professional/agenda?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
        headers: auth(secondSession.accessToken),
      });

      assert.equal(selectedClinicAgenda.statusCode, 200, selectedClinicAgenda.body);
      const body = selectedClinicAgenda.json() as { data: Appointment[] };
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.every((appointment) => appointment.clinicId === 3));
    } finally {
      await app.close();
    }
  });

  test('professional can switch between authorized clinics without logging in again', async () => {
    const app = await buildApp();

    try {
      const first = await login(app, MULTI_CLINIC_PROFESSIONAL_EMAIL, PASSWORD, CLINIC_ID);
      assert.equal(first.user.role, 'PROFISSIONAL');
      assert.equal(first.user.clinicId, CLINIC_ID);

      const second = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/professional/switch-clinic',
        headers: auth(first.accessToken),
        payload: { clinicId: 3 },
      });

      assert.equal(second.statusCode, 200, second.body);
      assert.equal(second.json().user.clinicId, 3);

      const forbiddenSwitch = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/professional/switch-clinic',
        headers: auth(first.accessToken),
        payload: { clinicId: 999999 },
      });

      assert.equal(forbiddenSwitch.statusCode, 403, forbiddenSwitch.body);
    } finally {
      await app.close();
    }
  });

  test('security: locks an account after the configured number of invalid passwords', async () => {
    const app = await buildApp();

    try {
      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          headers: { 'x-auth-mode': 'token' },
          payload: {
            email: PATIENT_EMAIL,
            password: 'SenhaErrada123!',
            clinicId: CLINIC_ID,
          },
        });

        if (attempt < 5) {
          assert.equal(response.statusCode, 401, response.body);
        } else {
          assert.equal(response.statusCode, 403, response.body);
          assert.match(response.body, /Limite de tentativas excedido/i);
        }
      }

      const afterLock = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'x-auth-mode': 'token' },
        payload: {
          email: PATIENT_EMAIL,
          password: PASSWORD,
        },
      });

      assert.equal(afterLock.statusCode, 403, afterLock.body);
      assert.match(afterLock.body, /Conta temporariamente bloqueada/i);
    } finally {
      await app.close();
    }
  });

  test('public booking: catalogs and appointment creation work without authentication', async () => {
    const app = await buildApp();

    try {
      const clinicsResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/public/clinics',
      });
      assert.equal(clinicsResponse.statusCode, 200, clinicsResponse.body);

      const clinics = clinicsResponse.json().data as { id: number; name: string }[];
      assert.ok(clinics.length >= 1);
      // A clínica técnica do acesso global (inativa) não aparece para o público.
      assert.ok(clinics.every((clinic) => clinic.name !== 'HealthSync - Acesso Global'));

      const specialtiesResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/public/catalog/specialties?clinicId=${CLINIC_ID}`,
      });
      assert.equal(specialtiesResponse.statusCode, 200, specialtiesResponse.body);

      const specialties = specialtiesResponse.json().data as { id: number; name: string }[];
      assert.ok(specialties.length >= 1);

      const professionalsResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/public/catalog/professionals?clinicId=${CLINIC_ID}`,
      });
      assert.equal(professionalsResponse.statusCode, 200, professionalsResponse.body);

      const professionals = professionalsResponse.json().data as {
        id: number;
        name: string;
        crm: string;
        specialties: number[];
        consultationDurationMinutes: number;
      }[];
      assert.ok(professionals.length >= 1);

      const firstSpecialty = specialties[0];
      assert.ok(firstSpecialty, 'Deve existir especialidade ativa');
      const professional = professionals.find((item) => item.specialties.includes(firstSpecialty.id));
      assert.ok(professional);

      const date = new Date(nextMondayAtUtc(10));
      const availabilityResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/public/availability?professionalId=${professional.id}&date=${date.toISOString().slice(0, 10)}`,
      });
      assert.equal(availabilityResponse.statusCode, 200, availabilityResponse.body);

      const slots = availabilityResponse.json().data as { dateTime: string; durationMinutes: number }[];
      const firstSlot = slots[0];
      assert.ok(firstSlot, 'Deve existir ao menos um horário livre');

      const bookingResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/public/appointments',
        payload: {
          clinicId: CLINIC_ID,
          professionalId: professional.id,
          specialtyId: firstSpecialty.id,
          dateTime: firstSlot.dateTime,
          durationMinutes: firstSlot.durationMinutes,
          type: 'PRESENCIAL',
          location: 'Consultório',
          name: 'Paciente Público de Teste',
          cpf: '52998224725',
          email: 'publico.teste@example.com',
          phone: '(11) 98888-1111',
          birthDate: '1990-01-01',
          gender: 'Outro',
          lgpdConsentAccepted: true,
        },
      });

      assert.equal(bookingResponse.statusCode, 201, bookingResponse.body);
      assert.match(bookingResponse.body, /Consulta agendada com sucesso/i);
    } finally {
      await app.close();
    }
  });

  test('US016: document upload requires an active attendance and multipart file', async () => {
    const app = await buildApp();

    try {
      const patientSession = await login(app, PATIENT_EMAIL);
      const appointment = await getReferenceAppointment(app, patientSession.accessToken);
      const professionalSession = await login(app, PROFESSIONAL_EMAIL);

      // Requisição que não é multipart é recusada pelo próprio Fastify.
      const notMultipart = await app.inject({
        method: 'POST',
        url: `/api/v1/professional/appointments/${appointment.id}/documents`,
        headers: auth(professionalSession.accessToken),
      });
      assert.equal(notMultipart.statusCode, 406, notMultipart.body);

      // Multipart sem arquivo é recusado pela API.
      const boundary = '----healthsync-test';
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/professional/appointments/${appointment.id}/documents`,
        headers: {
          ...auth(professionalSession.accessToken),
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload: `--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nsem arquivo\r\n--${boundary}--\r\n`,
      });

      assert.equal(response.statusCode, 422, response.body);
      assert.match(response.body, /Arquivo é obrigatório/i);
    } finally {
      await app.close();
    }
  });
});
