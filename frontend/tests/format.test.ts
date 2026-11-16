import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  capitalizeFirst,
  formatTime,
  monthTitle,
  firstNameOf,
  formatWeekdayDate,
  statusLabel,
  stripSeconds,
  formatDateTimeShort,
  filterPatientsOfTheDay,
} from '../src/app/lib/format';
import { ageFromBirthDate, effectivePriorities, togglePriority } from '../src/app/lib/priorities';

describe('firstNameOf', () => {
  test('usa o nome da conta e ignora partículas', () => {
    assert.equal(firstNameOf('maria da silva'), 'Maria');
    assert.equal(firstNameOf('  JOÃO  pedro '), 'João');
  });
  test('separa o e-mail quando não há nome', () => {
    assert.equal(firstNameOf(undefined, 'joao.silva@x.com'), 'Joao');
    assert.equal(firstNameOf('', 'ana_paula99@x.com'), 'Ana');
  });
  test('fallback', () => {
    assert.equal(firstNameOf(null, null), 'Paciente');
  });
});

describe('datas e textos', () => {
  test('dia da semana em português', () => {
    const text = formatWeekdayDate(new Date(2026, 10, 10, 12));
    assert.match(text, /^Terça-feira/);
    assert.doesNotMatch(text, /Tuesday/);
  });
  test('stripSeconds remove só segundos', () => {
    assert.equal(
      stripSeconds('Consulta em 10/11/2026 14:30:00 confirmada'),
      'Consulta em 10/11/2026 14:30 confirmada',
    );
    assert.equal(stripSeconds('às 9:05:59 e 14:30'), 'às 9:05 e 14:30');
  });
  test('stripSeconds converte data ISO antiga', () => {
    assert.equal(
      stripSeconds('Consulta agendada para 2026-11-20T13:00:00.000Z'),
      'Consulta agendada para 20/11/2026 às 10:00',
    );
  });
  test('formatDateTimeShort sem segundos', () => {
    const out = formatDateTimeShort(new Date(2026, 10, 10, 14, 30, 45));
    assert.equal(out, '10/11/2026 às 14:30');
    assert.equal(formatDateTimeShort('lixo'), '');
  });
  test('statusLabel', () => {
    assert.equal(statusLabel('CONFIRMADA'), 'Confirmada');
    assert.equal(statusLabel('OUTRO'), 'OUTRO');
  });
});

describe('prioridades', () => {
  const today = new Date(2026, 10, 10);
  test('idade', () => {
    assert.equal(ageFromBirthDate('1966-11-10', today), 60);
    assert.equal(ageFromBirthDate('1966-11-11', today), 59);
    assert.equal(ageFromBirthDate(undefined, today), null);
  });
  test('Idoso automático a partir de 60 anos', () => {
    assert.deepEqual(effectivePriorities({ birthDate: '1960-01-01' }, today), ['IDOSO']);
    assert.deepEqual(effectivePriorities({ birthDate: '1990-01-01' }, today), []);
    assert.deepEqual(
      effectivePriorities(
        { birthDate: '1950-01-01', priorities: ['PESSOA_COM_DEFICIENCIA', 'IDOSO'] },
        today,
      ),
      ['IDOSO', 'PESSOA_COM_DEFICIENCIA'],
    );
  });
  test('togglePriority', () => {
    assert.deepEqual(togglePriority([], 'GESTANTE'), ['GESTANTE']);
    assert.deepEqual(togglePriority(['GESTANTE'], 'GESTANTE'), []);
  });
});

describe('filtro de pacientes do dia', () => {
  const today = new Date(2026, 10, 10);
  const items = [
    { patient: { name: 'José Álvares', birthDate: '1950-05-05' } },
    { patient: { name: 'Mariana Souza', birthDate: '1995-05-05', priorities: ['GESTANTE' as const] } },
    { patient: { name: 'Carlos Lima', birthDate: '1990-05-05' } },
    { patient: null },
  ];
  test('busca por nome sem acento/caixa', () => {
    assert.equal(filterPatientsOfTheDay(items, 'jose alvares', 'TODOS', today).length, 1);
    assert.equal(filterPatientsOfTheDay(items, 'MARI', 'TODOS', today)[0].patient?.name, 'Mariana Souza');
    assert.equal(filterPatientsOfTheDay(items, '', 'TODOS', today).length, 4);
  });
  test('filtro por preferência', () => {
    assert.equal(filterPatientsOfTheDay(items, '', 'PRIORITARIOS', today).length, 2);
    assert.equal(filterPatientsOfTheDay(items, '', 'IDOSO', today)[0].patient?.name, 'José Álvares');
    assert.equal(filterPatientsOfTheDay(items, 'mari', 'IDOSO', today).length, 0);
  });
});

describe('títulos de calendário', () => {
  test('só a primeira letra maiúscula (antes saía "Novembro De 2026")', () => {
    assert.equal(monthTitle(new Date(2026, 10, 15)), 'Novembro de 2026');
    assert.equal(capitalizeFirst('segunda-feira, 16/11/2026'), 'Segunda-feira, 16/11/2026');
    assert.equal(capitalizeFirst(''), '');
  });
  test('horário só com hora e minuto', () => {
    assert.equal(formatTime(new Date(2026, 10, 16, 9, 5, 59)), '09:05');
  });
});
