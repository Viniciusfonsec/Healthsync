import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { buildAppointmentIcs } from '../src/infrastructure/calendar/ics.js';

describe('buildAppointmentIcs', () => {
  const ics = buildAppointmentIcs({
    appointmentId: 42,
    title: 'Consulta - Dra. Ana, Cardiologia; teste',
    description: 'Linha 1\nLinha 2',
    location: 'Consultório',
    start: new Date('2026-11-20T17:30:00Z'),
    durationMinutes: 30,
  });

  test('gera evento com UID estável, horários em UTC e lembrete', () => {
    assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
    assert.match(ics, /UID:healthsync-appointment-42@healthsync\r\n/);
    assert.match(ics, /DTSTART:20261120T173000Z\r\n/);
    assert.match(ics, /DTEND:20261120T180000Z\r\n/);
    assert.match(ics, /TRIGGER:-PT60M\r\n/);
    assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  });

  test('escapa vírgula, ponto e vírgula e quebra de linha', () => {
    assert.match(ics, /SUMMARY:Consulta - Dra\. Ana\\, Cardiologia\\; teste\r\n/);
    assert.match(ics, /DESCRIPTION:Linha 1\\nLinha 2\r\n/);
  });

  test('nenhuma linha passa de 75 bytes', () => {
    for (const line of ics.split('\r\n')) {
      assert.ok(Buffer.byteLength(line, 'utf8') <= 75, line);
    }
  });
});
