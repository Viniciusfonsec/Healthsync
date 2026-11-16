import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

import { ScheduleStepper } from '../src/app/components/ScheduleStepper';
import { PriorityBadges } from '../src/app/components/PriorityBadges';
import { PrioritySelector } from '../src/app/components/PrioritySelector';
import { BackButton } from '../src/app/components/BackButton';
import { ClinicStep } from '../src/app/pages/patient/schedule/ClinicStep';
import { ProfessionalStep } from '../src/app/pages/patient/schedule/ProfessionalStep';
import type { Clinic, Professional } from '../src/app/lib/api';

/**
 * Testes de componentes: conferem o HTML que cada componente gera
 * (renderização no servidor, sem navegador).
 */

const inRouter = (element: React.ReactElement) => renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
const count = (html: string, pattern: RegExp) => (html.match(pattern) ?? []).length;

describe('ScheduleStepper', () => {
  test('marca as etapas concluídas, a atual e as futuras', () => {
    const html = renderToStaticMarkup(<ScheduleStepper steps={['Unidade', 'Especialidade', 'Profissional', 'Data e hora']} current={3} />);
    assert.equal(count(html, /<li /g), 4);
    assert.equal(count(html, /aria-label="concluída"/g), 2, 'etapas 1 e 2 com ✓');
    assert.match(html, /aria-current="step"[^>]*>[\s\S]*?>3</, 'etapa 3 é a atual');
    assert.match(html, />4</, 'etapa 4 ainda mostra o número');
    // 4 colunas: centros em 12,5% · 37,5% · 62,5% · 87,5%; até a etapa 3 a linha vai de 12,5% a 62,5%.
    assert.match(html, /left:12\.5%;width:50%/, 'linha de progresso termina no centro da etapa 3');
  });

  test('funciona com 5 etapas (agendamento sem login)', () => {
    const html = renderToStaticMarkup(<ScheduleStepper steps={['A', 'B', 'C', 'D', 'E']} current={1} />);
    assert.match(html, /repeat\(5, minmax\(0, 1fr\)\)/);
    assert.match(html, /width:0%/);
  });
});

describe('Preferências de atendimento', () => {
  test('selos: mostram as preferências e incluem Idoso automaticamente aos 60+', () => {
    const html = renderToStaticMarkup(<PriorityBadges patient={{ birthDate: '1950-01-01', priorities: ['GESTANTE'] }} />);
    assert.match(html, /Idoso/);
    assert.match(html, /Gestante/);
    assert.equal(renderToStaticMarkup(<PriorityBadges patient={{ birthDate: '1995-01-01', priorities: [] }} />), '');
  });

  test('seletor: marca as opções escolhidas e tem rótulo para cada caixa', () => {
    const html = renderToStaticMarkup(<PrioritySelector value={['PESSOA_COM_DEFICIENCIA']} onChange={() => undefined} idPrefix="t" />);
    assert.equal(count(html, /type="checkbox"/g), 3);
    assert.equal(count(html, /checked=""/g), 1);
    assert.match(html, /id="t-PESSOA_COM_DEFICIENCIA"[^>]*checked=""|checked=""[^>]*id="t-PESSOA_COM_DEFICIENCIA"/);
    for (const id of ['t-IDOSO', 't-GESTANTE', 't-PESSOA_COM_DEFICIENCIA']) assert.match(html, new RegExp(`for="${id}"`));
  });
});

describe('Botão Voltar', () => {
  test('usa o estilo padrão de botão secundário e o texto informado', () => {
    const html = inRouter(<BackButton label="Voltar ao início" to="/" />);
    assert.match(html, /<button type="button" class="btn btn-secondary/);
    assert.match(html, /Voltar ao início/);
  });
});

describe('Etapas do agendamento do paciente', () => {
  const clinic = (id: string, name: string, active = true) => ({ id, name, active, phone: '(61) 3000-0000' }) as Clinic;

  test('unidade: lista só as ativas e avisa quando não há nenhuma', () => {
    const html = inRouter(<ClinicStep clinics={[clinic('2', 'Clínica Demo'), clinic('9', 'Inativa', false)]} onSelect={() => undefined} />);
    assert.match(html, /Clínica Demo/);
    assert.doesNotMatch(html, /Inativa/);
    assert.match(inRouter(<ClinicStep clinics={[]} onSelect={() => undefined} />), /Nenhuma unidade disponível/);
  });

  test('profissional: mostra dias de atendimento em português', () => {
    const professional = {
      id: '1', name: 'Dr. Carlos Matos', crm: 'CRM-DF 1234', specialties: ['1'], active: true,
      availability: [{ dayOfWeek: 1, startTime: '08:00', endTime: '17:00', durationMinutes: 30, active: true }],
    } as unknown as Professional;
    const html = inRouter(
      <ProfessionalStep clinicName="Clínica Demo" specialtyName="Cardiologia" professionals={[professional]} onSelect={() => undefined} onBack={() => undefined} />,
    );
    assert.match(html, /Dr\. Carlos Matos/);
    assert.match(html, /Segunda-feira · 08:00–17:00/);
    assert.match(html, /Clínica Demo · Cardiologia/);
  });
});
