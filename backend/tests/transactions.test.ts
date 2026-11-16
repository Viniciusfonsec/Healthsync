process.env.NODE_ENV = 'test';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createRepositories } from '../src/infrastructure/repositories/InMemoryRepositories.js';
import { seed } from '../src/infrastructure/bootstrap.js';
import { BcryptPasswordHasher } from '../src/infrastructure/crypto/PasswordHasher.js';
import { SchedulingService } from '../src/application/services/SchedulingService.js';
import type { SystemSettings } from '../src/domain/entities/types.js';

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

function nextMondayAtUtc(hour: number): string {
  const now = new Date();
  const result = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0, 0));
  let days = (1 - now.getUTCDay() + 7) % 7;
  if (days === 0) days = 7;
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString();
}

test('agendamento sem login é tudo ou nada: se a consulta falha, usuário e paciente novos não ficam', async () => {
  const hasher = new BcryptPasswordHasher();
  const repos = createRepositories(settings);
  await seed(repos, hasher, 'ChangeMe123!');
  const professionalUser = await repos.users.findByEmail('carlos.matos@healthsync.local');
  const professional = professionalUser && (await repos.professionals.findByUserId(professionalUser.id));
  assert.ok(professional);
  const usersBefore = (await repos.users.list()).length;

  // Simula uma falha do banco no último passo (gravar a consulta).
  repos.appointments.create = async () => {
    throw new Error('falha ao gravar a consulta');
  };

  const service = new SchedulingService(repos);
  await assert.rejects(
    service.createPublicAppointment(
      {
        clinicId: professional.clinicId,
        professionalId: professional.id,
        specialtyId: professional.specialties[0]!,
        dateTime: nextMondayAtUtc(13),
        durationMinutes: professional.consultationDurationMinutes,
        type: 'PRESENCIAL',
        location: 'Recepção',
        name: 'Paciente Rollback',
        email: 'rollback@healthsync.local',
        phone: '11966665555',
        cpf: '52998224725',
        birthDate: '1990-01-01',
        gender: 'Outro',
        lgpdConsentAccepted: true,
      },
      hasher,
    ),
    /falha ao gravar a consulta/,
  );

  assert.equal(await repos.patients.findByCpf('52998224725'), undefined);
  assert.equal((await repos.users.list()).length, usersBefore);
});
