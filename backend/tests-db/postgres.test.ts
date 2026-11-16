/**
 * Integração com PostgreSQL de verdade (rodar com: npm run test:db).
 *
 * Cada teste faz a operação pela API (Fastify + Prisma) e depois confere,
 * com SQL direto no banco, que o dado foi gravado de fato.
 * Os testes rodam em ordem e compartilham o mesmo banco recém-migrado.
 */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';

import { buildApp } from '../src/app.js';
import { createPrismaRepositories } from '../src/infrastructure/repositories/PrismaRepositories.js';
import { ReminderJob } from '../src/infrastructure/scheduler/ReminderJob.js';
import { AuditRetentionJob } from '../src/infrastructure/scheduler/AuditRetentionJob.js';
import { NotificationDispatcher } from '../src/infrastructure/scheduler/NotificationDispatcher.js';
import type { NotificationGateway } from '../src/infrastructure/gateways/NotificationGateways.js';

assert.equal(process.env.USE_DATABASE, 'true', 'Rode esta suíte com: npm run test:db');

const PASSWORD = process.env.SEED_PASSWORD ?? 'ChangeMe123!';
const PATIENT_EMAIL = 'joaopedro@email.com';
const PROFESSIONAL_EMAIL = 'carlos.matos@healthsync.local';
const ADMIN_EMAIL = 'admin@healthsync.local';
const LOCKOUT_EMAIL = 'fernanda.lima@healthsync.local';
const DEMO_CLINIC_ID = 2;
const HOUR = 60 * 60 * 1000;

type Session = { accessToken: string };
type Appointment = {
  id: number;
  professionalId: number;
  specialtyId: number;
  dateTime: string;
  status: string;
};

let app: FastifyInstance;
let db: pg.Client;
let patientToken: string;
let professionalToken: string;
let adminToken: string;
let patientId: number;
let professionalId: number;
let specialtyId: number;

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

/** Uma linha do banco. Datas vêm como texto ISO em UTC para não depender do fuso da máquina. */
async function row<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> {
  const result = await db.query(sql, params);
  assert.equal(result.rowCount, 1, `esperava 1 linha para: ${sql}`);
  return result.rows[0] as T;
}

const isoUtc = (column: string) => `to_char("${column}", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "${column}"`;

async function login(email: string, password = PASSWORD) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    headers: { 'x-auth-mode': 'token' },
    payload: { email, password },
  });
}

async function session(email: string): Promise<string> {
  const response = await login(email);
  assert.equal(response.statusCode, 200, response.body);
  const body = response.json() as Session & { requiresClinicSelection?: boolean; selectionToken?: string };
  if (!body.requiresClinicSelection) return body.accessToken;
  const selected = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/professional/select-clinic',
    headers: { 'x-auth-mode': 'token' },
    payload: { selectionToken: body.selectionToken, clinicId: DEMO_CLINIC_ID },
  });
  assert.equal(selected.statusCode, 200, selected.body);
  return (selected.json() as Session).accessToken;
}

function nextMondayAtUtc(hour: number): string {
  const now = new Date();
  const result = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0, 0));
  let days = (1 - now.getUTCDay() + 7) % 7;
  if (days === 0) days = 7;
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString();
}

/** Consulta gravada direto no banco (a API, corretamente, não deixa agendar no passado). */
async function insertAppointment(offsetMs: number, status = 'AGENDADA'): Promise<number> {
  const when = new Date(Date.now() + offsetMs).toISOString();
  const inserted = await row<{ id: number }>(
    `INSERT INTO "Appointment"
       ("clinicId", "patientId", "professionalId", "specialtyId", "dateTime", "durationMinutes",
        "type", "location", "status", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5::timestamp, 30, 'PRESENCIAL', 'Consultório de teste', $6, now(), now())
     RETURNING id`,
    [DEMO_CLINIC_ID, patientId, professionalId, specialtyId, when, status],
  );
  return inserted.id;
}

before(async () => {
  db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  app = await buildApp(); // conecta pelo Prisma e roda o seed no banco vazio

  patientToken = await session(PATIENT_EMAIL);
  professionalToken = await session(PROFESSIONAL_EMAIL);
  adminToken = await session(ADMIN_EMAIL);

  patientId = (
    await row<{ id: number }>(
      `SELECT p.id FROM "Patient" p JOIN "User" u ON u.id = p."userId" WHERE u.email = $1`,
      [PATIENT_EMAIL],
    )
  ).id;
  const professional = await row<{ id: number; specialtyId: number }>(
    `SELECT p.id, ps."specialtyId" FROM "Professional" p
       JOIN "User" u ON u.id = p."userId"
       JOIN "ProfessionalSpecialty" ps ON ps."professionalId" = p.id
      WHERE u.email = $1 ORDER BY ps."specialtyId" LIMIT 1`,
    [PROFESSIONAL_EMAIL],
  );
  professionalId = professional.id;
  specialtyId = professional.specialtyId;
});

after(async () => {
  await app?.close();
  await db?.end();
});

describe('PostgreSQL: estrutura e seed', () => {
  test('migrations criaram as tabelas e o seed gravou os dados iniciais', async () => {
    const tables = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const names = tables.rows.map((item) => item.table_name);
    for (const table of [
      'Appointment',
      'Attendance',
      'Clinic',
      'Document',
      'Notification',
      'Patient',
      'Professional',
      'User',
    ]) {
      assert.ok(names.includes(table), `tabela ${table} ausente`);
    }

    const clinics = await db.query(`SELECT id, name, active FROM "Clinic" ORDER BY id`);
    assert.deepEqual(
      clinics.rows.map((item) => [item.id, item.name, item.active]),
      [
        [1, 'HealthSync - Acesso Global', false],
        [2, 'HealthSync Clínica Demo', true],
        [3, 'Clínica Saúde Integrada', true],
      ],
    );

    const health = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(health.json().database, 'postgresql');
  });
});

describe('PostgreSQL: autenticação', () => {
  test('tentativas de senha errada e o bloqueio ficam gravados no usuário', async () => {
    const max = Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5);
    for (let attempt = 1; attempt <= max; attempt += 1) {
      const response = await login(LOCKOUT_EMAIL, 'senha-errada-123');
      assert.ok([401, 403].includes(response.statusCode), response.body);
    }
    const user = await row<{ failedLoginAttempts: number; locked: boolean }>(
      `SELECT "failedLoginAttempts", "lockedUntil" > now() AS locked FROM "User" WHERE email = $1`,
      [LOCKOUT_EMAIL],
    );
    assert.equal(user.locked, true, 'a conta deveria estar bloqueada no banco');

    const correctPassword = await login(LOCKOUT_EMAIL);
    assert.equal(correctPassword.statusCode, 403, 'conta bloqueada não entra nem com a senha certa');
  });
});

describe('PostgreSQL: consultas do paciente', () => {
  let appointmentId: number;

  test('agendar grava a consulta e as notificações (só hora e minuto)', async () => {
    const availability = await app.inject({
      method: 'PUT',
      url: '/api/v1/professional/agenda/availability',
      headers: auth(professionalToken),
      payload: {
        slots: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
          dayOfWeek,
          startTime: '08:00',
          endTime: '17:00',
          durationMinutes: 30,
        })),
      },
    });
    assert.equal(availability.statusCode, 200, availability.body);
    const slots = await row<{ total: number }>(
      `SELECT count(*)::int AS total FROM "AvailabilitySlot" WHERE "professionalId" = $1 AND active`,
      [professionalId],
    );
    assert.equal(slots.total, 5);

    const dateTime = nextMondayAtUtc(13); // 10:00 em Brasília
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/patient/appointments',
      headers: auth(patientToken),
      payload: {
        clinicId: DEMO_CLINIC_ID,
        professionalId,
        specialtyId,
        dateTime,
        durationMinutes: 30,
        type: 'PRESENCIAL',
        location: 'Consultório 1',
      },
    });
    assert.equal(response.statusCode, 201, response.body);
    const created = response.json() as Appointment;
    assert.equal(typeof created.id, 'number');
    appointmentId = created.id;

    const stored = await row<{ status: string; clinicId: number; dateTime: string }>(
      `SELECT status, "clinicId", ${isoUtc('dateTime')} FROM "Appointment" WHERE id = $1`,
      [appointmentId],
    );
    assert.deepEqual(stored, { status: 'AGENDADA', clinicId: DEMO_CLINIC_ID, dateTime });

    const notifications = await db.query(
      `SELECT content FROM "Notification" WHERE "appointmentId" = $1 AND "patientId" = $2`,
      [appointmentId, patientId],
    );
    assert.ok(
      notifications.rowCount && notifications.rowCount >= 2,
      'esperava notificação por WhatsApp e e-mail',
    );
    for (const { content } of notifications.rows) {
      assert.match(content, /\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}/);
      assert.doesNotMatch(
        content,
        /\d{2}:\d{2}:\d{2}|T\d{2}:\d{2}/,
        `notificação com segundos/ISO: ${content}`,
      );
    }
  });

  test('horário ocupado é recusado e nada é gravado', async () => {
    const before = await row<{ total: number }>(`SELECT count(*)::int AS total FROM "Appointment"`);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/patient/appointments',
      headers: auth(patientToken),
      payload: {
        clinicId: DEMO_CLINIC_ID,
        professionalId,
        specialtyId,
        dateTime: nextMondayAtUtc(13),
        durationMinutes: 30,
        type: 'PRESENCIAL',
        location: 'Consultório 1',
      },
    });
    assert.equal(response.statusCode, 409, response.body);
    const afterCount = await row<{ total: number }>(`SELECT count(*)::int AS total FROM "Appointment"`);
    assert.equal(afterCount.total, before.total);
  });

  test('remarcar e cancelar atualizam a mesma linha', async () => {
    const newDateTime = nextMondayAtUtc(14);
    const rescheduled = await app.inject({
      method: 'PATCH',
      url: `/api/v1/patient/appointments/${appointmentId}/reschedule`,
      headers: auth(patientToken),
      payload: { dateTime: newDateTime },
    });
    assert.equal(rescheduled.statusCode, 200, rescheduled.body);
    assert.equal(
      (
        await row<{ dateTime: string }>(`SELECT ${isoUtc('dateTime')} FROM "Appointment" WHERE id = $1`, [
          appointmentId,
        ])
      ).dateTime,
      newDateTime,
    );

    const cancelled = await app.inject({
      method: 'POST',
      url: `/api/v1/patient/appointments/${appointmentId}/cancel`,
      headers: auth(patientToken),
      payload: { reason: 'Imprevisto no trabalho' },
    });
    assert.equal(cancelled.statusCode, 200, cancelled.body);
    const stored = await row<{ status: string; cancellationReason: string }>(
      `SELECT status, "cancellationReason" FROM "Appointment" WHERE id = $1`,
      [appointmentId],
    );
    assert.deepEqual(stored, { status: 'CANCELADA', cancellationReason: 'Imprevisto no trabalho' });
  });

  test('horário liberado por cancelamento pode ser agendado de novo', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/patient/appointments',
      headers: auth(patientToken),
      payload: {
        clinicId: DEMO_CLINIC_ID,
        professionalId,
        specialtyId,
        dateTime: nextMondayAtUtc(14),
        durationMinutes: 30,
        type: 'PRESENCIAL',
        location: 'Consultório 1',
      },
    });
    assert.equal(response.statusCode, 201, response.body);
    const sameSlot = await row<{ cancelled: number; active: number }>(
      `SELECT count(*) FILTER (WHERE status = 'CANCELADA')::int AS cancelled,
              count(*) FILTER (WHERE status IN ('AGENDADA', 'CONFIRMADA'))::int AS active
         FROM "Appointment" WHERE "professionalId" = $1 AND "dateTime" = $2::timestamp`,
      [professionalId, nextMondayAtUtc(14)],
    );
    assert.deepEqual(sameSlot, { cancelled: 1, active: 1 });
  });

  test('dois pedidos simultâneos para o mesmo horário: um agenda, o outro recebe 409', async () => {
    const payload = {
      clinicId: DEMO_CLINIC_ID,
      professionalId,
      specialtyId,
      dateTime: nextMondayAtUtc(16),
      durationMinutes: 30,
      type: 'PRESENCIAL',
      location: 'Consultório 1',
    };
    const responses = await Promise.all(
      [1, 2].map(() =>
        app.inject({
          method: 'POST',
          url: '/api/v1/patient/appointments',
          headers: auth(patientToken),
          payload,
        }),
      ),
    );
    assert.deepEqual(
      responses.map((item) => item.statusCode).sort(),
      [201, 409],
      responses.map((item) => item.body).join(' | '),
    );
    const active = await row<{ total: number }>(
      `SELECT count(*)::int AS total FROM "Appointment"
        WHERE "professionalId" = $1 AND "dateTime" = $2::timestamp AND status IN ('AGENDADA', 'CONFIRMADA')`,
      [professionalId, nextMondayAtUtc(16)],
    );
    assert.equal(active.total, 1);
  });

  test('preferências do paciente são gravadas como lista no banco', async () => {
    const saved = await app.inject({
      method: 'PATCH',
      url: '/api/v1/patient/profile',
      headers: auth(patientToken),
      payload: { priorities: ['GESTANTE', 'PESSOA_COM_DEFICIENCIA', 'GESTANTE'] },
    });
    assert.equal(saved.statusCode, 200, saved.body);
    const stored = await row<{ priorities: string }>(`SELECT priorities::text FROM "Patient" WHERE id = $1`, [
      patientId,
    ]);
    assert.equal(stored.priorities, '{GESTANTE,PESSOA_COM_DEFICIENCIA}');

    const profile = await app.inject({
      method: 'GET',
      url: '/api/v1/patient/profile',
      headers: auth(patientToken),
    });
    assert.deepEqual(profile.json().priorities, ['GESTANTE', 'PESSOA_COM_DEFICIENCIA']);

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/patient/profile',
      headers: auth(patientToken),
      payload: { priorities: [] },
    });
    const cleared = await row<{ priorities: string }>(
      `SELECT priorities::text FROM "Patient" WHERE id = $1`,
      [patientId],
    );
    assert.equal(cleared.priorities, '{}');
  });

  test('agendamento sem login cria paciente, preferências e consulta no banco', async () => {
    const cpf = '52998224725';
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/appointments',
      payload: {
        clinicId: DEMO_CLINIC_ID,
        professionalId,
        specialtyId,
        dateTime: nextMondayAtUtc(15),
        durationMinutes: 30,
        type: 'PRESENCIAL',
        location: 'Recepção',
        name: 'Paciente Integração',
        email: 'paciente.integracao@healthsync.local',
        phone: '11988887777',
        cpf,
        birthDate: '1950-03-10',
        gender: 'Feminino',
        lgpdConsentAccepted: true,
        priorities: ['IDOSO'],
      },
    });
    assert.equal(response.statusCode, 201, response.body);
    const patient = await row<{ priorities: string; appointments: number }>(
      `SELECT p.priorities::text,
              (SELECT count(*)::int FROM "Appointment" a WHERE a."patientId" = p.id) AS appointments
         FROM "Patient" p WHERE p.cpf = $1`,
      [cpf],
    );
    assert.deepEqual(patient, { priorities: '{IDOSO}', appointments: 1 });
  });
});

describe('PostgreSQL: retenção da auditoria', () => {
  test('registros mais antigos que a retenção configurada são apagados do banco', async () => {
    await db.query(
      `INSERT INTO "AuditLog" (action, resource, "createdAt") VALUES ('UPDATE', 'Teste antigo', now() - interval '400 days'), ('UPDATE', 'Teste recente', now())`,
    );
    const removed = await new AuditRetentionJob(createPrismaRepositories()).run();
    assert.ok(removed >= 1);
    const left = await db.query(`SELECT resource FROM "AuditLog" WHERE resource LIKE 'Teste %'`);
    assert.deepEqual(
      left.rows.map((item) => item.resource),
      ['Teste recente'],
    );
  });
});

describe('PostgreSQL: transações', () => {
  test('se algo falha no meio, nada do que foi gravado na transação fica no banco', async () => {
    const repos = createPrismaRepositories();
    const email = 'transacao.desfeita@healthsync.local';
    await assert.rejects(
      repos.transaction(async (tx) => {
        const now = new Date().toISOString();
        await tx.users.create({
          clinicId: DEMO_CLINIC_ID,
          role: 'PACIENTE',
          email,
          passwordHash: 'x',
          active: true,
          isGuest: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
          createdAt: now,
          updatedAt: now,
        });
        assert.ok(await tx.users.findByEmail(email), 'dentro da transação o usuário existe');
        throw new Error('falha simulada depois de gravar');
      }),
      /falha simulada/,
    );
    const total = await row<{ total: number }>(`SELECT count(*)::int AS total FROM "User" WHERE email = $1`, [
      email,
    ]);
    assert.equal(total.total, 0);
  });

  test('dois agendamentos sem login no mesmo horário: só um paciente novo fica gravado', async () => {
    const dateTime = nextMondayAtUtc(19); // 16:00 em Brasília
    const booking = (cpf: string, email: string) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/public/appointments',
        payload: {
          clinicId: DEMO_CLINIC_ID,
          professionalId,
          specialtyId,
          dateTime,
          durationMinutes: 30,
          type: 'PRESENCIAL',
          location: 'Recepção',
          name: 'Paciente Concorrente',
          email,
          phone: '11977776666',
          cpf,
          birthDate: '1990-01-01',
          gender: 'Outro',
          lgpdConsentAccepted: true,
        },
      });
    const cpfs = ['11144477735', '39053344705'];
    const responses = await Promise.all([
      booking(cpfs[0]!, 'concorrente.a@healthsync.local'),
      booking(cpfs[1]!, 'concorrente.b@healthsync.local'),
    ]);
    assert.deepEqual(
      responses.map((item) => item.statusCode).sort(),
      [201, 409],
      responses.map((item) => item.body).join(' | '),
    );
    const patients = await row<{ total: number }>(
      `SELECT count(*)::int AS total FROM "Patient" WHERE cpf = ANY($1)`,
      [cpfs],
    );
    assert.equal(patients.total, 1, 'o pedido recusado não pode deixar paciente/usuário gravado');
  });
});

describe('PostgreSQL: administrador master', () => {
  test('cadastrar e editar profissional grava usuário, vínculos, especialidades e agenda numa transação só', async () => {
    const masterToken = await session('master@healthsync.local');
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/master/professionals',
      headers: auth(masterToken),
      payload: {
        clinicId: DEMO_CLINIC_ID,
        clinicIds: [DEMO_CLINIC_ID, 3],
        name: 'Dra. Integração',
        email: 'dra.integracao@healthsync.local',
        phone: '11955554444',
        crm: 'CRM-DF 99999',
        specialties: [specialtyId],
        consultationDurationMinutes: 30,
        password: 'SenhaForte123!',
      },
    });
    assert.equal(created.statusCode, 201, created.body);
    const id = (created.json() as { id: number }).id;
    const stored = await row<{ role: string; clinics: number; specialties: number; slots: number }>(
      `SELECT u.role,
              (SELECT count(*)::int FROM "ProfessionalClinic" pc WHERE pc."professionalId" = p.id) AS clinics,
              (SELECT count(*)::int FROM "ProfessionalSpecialty" ps WHERE ps."professionalId" = p.id) AS specialties,
              (SELECT count(*)::int FROM "AvailabilitySlot" a WHERE a."professionalId" = p.id) AS slots
         FROM "Professional" p JOIN "User" u ON u.id = p."userId" WHERE p.id = $1`,
      [id],
    );
    assert.deepEqual(stored, { role: 'PROFISSIONAL', clinics: 2, specialties: 1, slots: 5 });

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/v1/master/professionals/${id}`,
      headers: auth(masterToken),
      payload: { name: 'Dra. Integração Silva', consultationDurationMinutes: 40 },
    });
    assert.equal(updated.statusCode, 200, updated.body);
    const after = await row<{ name: string; consultationDurationMinutes: number; specialties: number }>(
      `SELECT name, "consultationDurationMinutes",
              (SELECT count(*)::int FROM "ProfessionalSpecialty" ps WHERE ps."professionalId" = p.id) AS specialties
         FROM "Professional" p WHERE p.id = $1`,
      [id],
    );
    assert.deepEqual(after, {
      name: 'Dra. Integração Silva',
      consultationDurationMinutes: 40,
      specialties: 1,
    });
  });
});

describe('PostgreSQL: profissional e relatórios', () => {
  test('registrar falta grava FALTA e aparece no relatório da unidade', async () => {
    const appointmentId = await insertAppointment(-2 * HOUR);
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/professional/appointments/${appointmentId}/no-show`,
      headers: auth(professionalToken),
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(
      (await row<{ status: string }>(`SELECT status FROM "Appointment" WHERE id = $1`, [appointmentId]))
        .status,
      'FALTA',
    );

    const from = new Date(Date.now() - 24 * HOUR).toISOString();
    const to = new Date(Date.now() + HOUR).toISOString();
    const report = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/reports/absences?from=${from}&to=${to}`,
      headers: auth(adminToken),
    });
    assert.equal(report.statusCode, 200, report.body);
    const ids = (report.json().data as Appointment[]).map((item) => item.id);
    assert.ok(ids.includes(appointmentId), 'falta não apareceu no relatório');
  });

  test('atendimento: abrir, anexar documento criptografado, finalizar e contar na produtividade', async () => {
    const appointmentId = await insertAppointment(-HOUR);

    const started = await app.inject({
      method: 'POST',
      url: `/api/v1/professional/appointments/${appointmentId}/attendance`,
      headers: auth(professionalToken),
      payload: { notes: 'Paciente estável' },
    });
    assert.equal(started.statusCode, 201, started.body);
    const attendanceId = (started.json() as { id: number }).id;

    // Documento: conteúdo gravado criptografado, download devolve o original.
    const content = Buffer.from('%PDF-1.4\nexame de integração HealthSync\n%%EOF\n');
    const boundary = '----healthsync-db-test';
    const multipart = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="exame.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
      ),
      content,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const upload = await app.inject({
      method: 'POST',
      url: `/api/v1/professional/appointments/${appointmentId}/documents?type=EXAME`,
      headers: { ...auth(professionalToken), 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: multipart,
    });
    assert.equal(upload.statusCode, 200, upload.body);
    const documentId = (upload.json() as { document: { id: number } }).document.id;
    const document = await row<{ iv: string; authTag: string; size: number; type: string }>(
      `SELECT iv, "authTag", size, type FROM "Document" WHERE id = $1 AND "attendanceId" = $2`,
      [documentId, attendanceId],
    );
    assert.ok(document.iv && document.authTag, 'documento sem dados de criptografia');
    assert.equal(document.size, content.length);
    assert.equal(document.type, 'EXAME');
    const download = await app.inject({
      method: 'GET',
      url: `/api/v1/professional/documents/${documentId}/download`,
      headers: auth(professionalToken),
    });
    assert.equal(download.statusCode, 200, download.body);
    assert.deepEqual(download.rawPayload, content);

    for (const status of ['EM_ANDAMENTO', 'FINALIZADO']) {
      const update = await app.inject({
        method: 'PATCH',
        url: `/api/v1/professional/attendances/${attendanceId}/status`,
        headers: auth(professionalToken),
        payload: { status },
      });
      assert.equal(update.statusCode, 200, update.body);
    }
    const stored = await row<{ attendance: string; appointment: string; finished: boolean }>(
      `SELECT t.status AS attendance, a.status AS appointment, t."finishedAt" IS NOT NULL AS finished
         FROM "Attendance" t JOIN "Appointment" a ON a.id = t."appointmentId" WHERE t.id = $1`,
      [attendanceId],
    );
    assert.deepEqual(stored, { attendance: 'FINALIZADO', appointment: 'REALIZADA', finished: true });

    const from = new Date(Date.now() - 24 * HOUR).toISOString();
    const to = new Date(Date.now() + HOUR).toISOString();
    const report = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/reports/productivity?from=${from}&to=${to}`,
      headers: auth(adminToken),
    });
    assert.equal(report.statusCode, 200, report.body);
    const line = (
      report.json().data as { professionalId: number; totalAttendances: number; finished: number }[]
    ).find((item) => item.professionalId === professionalId);
    assert.ok(
      line && line.totalAttendances >= 1 && line.finished >= 1,
      `produtividade inesperada: ${JSON.stringify(line)}`,
    );
  });

  test('lembretes automáticos (US004) gravam um por canal e não duplicam', async () => {
    const appointmentId = await insertAppointment(2 * HOUR, 'CONFIRMADA');
    const gateway = (channel: 'WHATSAPP' | 'EMAIL'): NotificationGateway => ({
      channel,
      send: async () => ({ success: true }),
    });
    const job = new ReminderJob(createPrismaRepositories(), gateway('WHATSAPP'), gateway('EMAIL'), 60_000);

    await job.run();
    await job.run();

    const reminders = await db.query(
      `SELECT channel, content FROM "Notification" WHERE "appointmentId" = $1 AND type = 'LEMBRETE'`,
      [appointmentId],
    );
    assert.deepEqual(reminders.rows.map((item) => item.channel).sort(), ['EMAIL', 'WHATSAPP']);
    assert.doesNotMatch(reminders.rows[0].content, /\d{2}:\d{2}:\d{2}/);
  });

  test('notificações pendentes são enviadas e o resultado fica gravado (US008)', async () => {
    const sent: string[] = [];
    const gateway = (channel: 'WHATSAPP' | 'EMAIL'): NotificationGateway => ({
      channel,
      send: async (to) => {
        sent.push(`${channel}:${to}`);
        return { success: true };
      },
    });
    const dispatcher = new NotificationDispatcher(
      createPrismaRepositories(),
      [gateway('WHATSAPP'), gateway('EMAIL')],
      60_000,
    );

    const before = await row<{ total: number }>(
      `SELECT count(*)::int AS total FROM "Notification" WHERE status = 'PENDENTE' AND channel <> 'IN_APP'`,
    );
    assert.ok(before.total > 0, 'deveria haver notificações pendentes dos testes anteriores');

    const summary = await dispatcher.run(500);
    assert.equal(summary.sent + summary.failed, before.total);
    assert.equal(sent.length, summary.sent);

    const pending = await row<{ total: number }>(
      `SELECT count(*)::int AS total FROM "Notification" WHERE status = 'PENDENTE' AND channel <> 'IN_APP'`,
    );
    assert.equal(pending.total, 0);
    const delivered = await row<{ total: number; withDate: number }>(
      `SELECT count(*)::int AS total, count("sentAt")::int AS "withDate" FROM "Notification" WHERE status = 'ENVIADO' AND channel <> 'IN_APP'`,
    );
    assert.equal(delivered.total, summary.sent);
    assert.equal(delivered.withDate, summary.sent);
  });
});
