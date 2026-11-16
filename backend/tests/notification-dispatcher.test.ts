process.env.NODE_ENV = 'test';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { createRepositories } from '../src/infrastructure/repositories/InMemoryRepositories.js';
import { seed } from '../src/infrastructure/bootstrap.js';
import { BcryptPasswordHasher } from '../src/infrastructure/crypto/PasswordHasher.js';
import {
  MAX_SEND_ATTEMPTS,
  NotificationDispatcher,
} from '../src/infrastructure/scheduler/NotificationDispatcher.js';
import type { NotificationGateway } from '../src/infrastructure/gateways/NotificationGateways.js';
import type { Repositories } from '../src/domain/repositories/contracts.js';
import type { CommunicationChannel, Notification, SystemSettings } from '../src/domain/entities/types.js';

/** US008: envio das notificações pendentes por WhatsApp e e-mail. */

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

type Sent = { channel: CommunicationChannel; to: string; content: string; subject?: string };

function recordingGateway(channel: 'WHATSAPP' | 'EMAIL', sent: Sent[], fail = false): NotificationGateway {
  return {
    channel,
    send: async (to, content, options) => {
      if (fail) throw new Error('provedor fora do ar');
      sent.push({ channel, to, content, subject: options?.subject });
      return { success: true };
    },
  };
}

async function setup() {
  const repos: Repositories = createRepositories(settings);
  await seed(repos, new BcryptPasswordHasher(), 'ChangeMe123!');
  const user = await repos.users.findByEmail('joaopedro@email.com');
  assert.ok(user);
  const patient = await repos.patients.findByUserId(user.id);
  assert.ok(patient);
  // O seed já cria notificações; começamos de uma fila vazia para o teste ser exato.
  for (const item of await repos.notifications.findPending(1000)) {
    await repos.notifications.update(item.id, { status: 'CANCELADO' });
  }
  const add = (patch: Partial<Notification>) =>
    repos.notifications.create({
      patientId: patient.id,
      type: 'CONSULTA',
      channel: 'EMAIL',
      content: 'Consulta agendada para 20/11/2026 às 10:00',
      status: 'PENDENTE',
      attempts: 0,
      createdAt: new Date().toISOString(),
      ...patch,
    });
  return { repos, patient, user, add };
}

describe('US008 – envio das notificações pendentes', () => {
  test('envia para o telefone (WhatsApp) e o e-mail do paciente e marca como ENVIADO', async () => {
    const { repos, patient, add } = await setup();
    const whatsapp = await add({ channel: 'WHATSAPP' });
    const email = await add({ channel: 'EMAIL', type: 'LEMBRETE' });
    const inApp = await add({ channel: 'IN_APP' });
    const sent: Sent[] = [];
    const dispatcher = new NotificationDispatcher(
      repos,
      [recordingGateway('WHATSAPP', sent), recordingGateway('EMAIL', sent)],
      60_000,
    );

    const summary = await dispatcher.run();

    assert.deepEqual(summary, { sent: 2, retrying: 0, failed: 0 });
    assert.deepEqual(
      sent
        .map(({ channel, to, subject }) => ({ channel, to, subject }))
        .sort((a, b) => a.channel.localeCompare(b.channel)),
      [
        { channel: 'EMAIL', to: patient.email, subject: 'HealthSync - Lembrete de consulta' },
        { channel: 'WHATSAPP', to: patient.phone, subject: undefined },
      ],
    );
    for (const id of [whatsapp.id, email.id]) {
      const stored = await repos.notifications.findById(id);
      assert.equal(stored?.status, 'ENVIADO');
      assert.ok(stored?.sentAt, 'sentAt deve ser preenchido');
      assert.equal(stored?.attempts, 1);
    }
    assert.equal(
      (await repos.notifications.findById(inApp.id))?.status,
      'PENDENTE',
      'IN_APP não passa pelos gateways',
    );

    assert.deepEqual(
      await dispatcher.run(),
      { sent: 0, retrying: 0, failed: 0 },
      'não reenviar o que já foi enviado',
    );
  });

  test(`tenta de novo quando o envio falha e desiste após ${MAX_SEND_ATTEMPTS} tentativas`, async () => {
    const { repos, add } = await setup();
    const notification = await add({ channel: 'EMAIL' });
    const dispatcher = new NotificationDispatcher(repos, [recordingGateway('EMAIL', [], true)], 60_000);

    for (let attempt = 1; attempt < MAX_SEND_ATTEMPTS; attempt += 1) {
      assert.deepEqual(await dispatcher.run(), { sent: 0, retrying: 1, failed: 0 });
      const stored = await repos.notifications.findById(notification.id);
      assert.deepEqual([stored?.status, stored?.attempts], ['PENDENTE', attempt]);
    }
    assert.deepEqual(await dispatcher.run(), { sent: 0, retrying: 0, failed: 1 });
    const stored = await repos.notifications.findById(notification.id);
    assert.deepEqual([stored?.status, stored?.attempts], ['ERRO', MAX_SEND_ATTEMPTS]);
  });

  test('marca ERRO quando não há para onde enviar e usa o e-mail da conta quando não é paciente', async () => {
    const { repos, user, add } = await setup();
    const noPhone = await add({ patientId: undefined, userId: user.id, channel: 'WHATSAPP' });
    const toAccount = await add({ patientId: undefined, userId: user.id, channel: 'EMAIL' });
    const sent: Sent[] = [];
    const dispatcher = new NotificationDispatcher(
      repos,
      [recordingGateway('WHATSAPP', sent), recordingGateway('EMAIL', sent)],
      60_000,
    );

    assert.deepEqual(await dispatcher.run(), { sent: 1, retrying: 0, failed: 1 });
    assert.equal((await repos.notifications.findById(noPhone.id))?.status, 'ERRO');
    assert.equal((await repos.notifications.findById(toAccount.id))?.status, 'ENVIADO');
    assert.deepEqual(
      sent.map((item) => item.to),
      [user.email],
    );
  });
});
