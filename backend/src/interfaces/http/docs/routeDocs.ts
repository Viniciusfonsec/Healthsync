import type { z } from 'zod';
import * as schemas from '../schemas/schemas.js';
import { clinicIdQuery, dateRangeQuery, idParam } from '../schemas/common.js';
import { listOf, ref } from './apiSchemas.js';
import type { JsonSchema } from './zodToJsonSchema.js';

/**
 * Documentação de cada rota para o Swagger (/docs).
 * As entradas (body, query, params) são os MESMOS schemas zod que validam a requisição.
 */
export type RouteDoc = {
  summary: string;
  description?: string;
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  /** Resposta de sucesso: código, descrição e schema. */
  ok?: [number, string, JsonSchema?];
  /** Erros específicos da rota (os de autenticação e validação são incluídos automaticamente). */
  errors?: Partial<Record<400 | 404 | 409 | 429 | 503, string>>;
};

const ok200 = (description: string, schema?: JsonSchema): [number, string, JsonSchema?] => [
  200,
  description,
  schema,
];
const created = (description: string, schema?: JsonSchema): [number, string, JsonSchema?] => [
  201,
  description,
  schema,
];

export const routeDocs: Record<string, RouteDoc> = {
  // ----- Autenticação -----
  'POST /auth/login': {
    summary: 'Entrar no sistema',
    description:
      'Abre a sessão no cookie httpOnly `hs_session`. Profissionais recebem `requiresClinicSelection` e escolhem a unidade em seguida. ' +
      'Para receber o token Bearer no corpo (Swagger, integrações), envie o cabeçalho `x-auth-mode: token`. Limite: 20 tentativas/min por e-mail.',
    body: schemas.loginSchema,
    ok: ok200('Sessão aberta, ou pedido de escolha de unidade (profissional)', {
      oneOf: [ref('Sessao'), ref('EscolhaDeUnidade')],
    }),
    errors: { 429: 'Muitas tentativas' },
  },
  'POST /auth/professional/select-clinic': {
    summary: 'Profissional escolhe a unidade de trabalho',
    body: schemas.professionalClinicSelectionSchema,
    ok: ok200('Sessão aberta na unidade escolhida', ref('Sessao')),
  },
  'POST /auth/professional/switch-clinic': {
    summary: 'Profissional troca de unidade sem sair',
    body: schemas.professionalClinicSelectionSchema.pick({ clinicId: true }),
    ok: ok200('Nova sessão na unidade escolhida', ref('Sessao')),
  },
  'GET /auth/me': { summary: 'Dados do usuário logado', ok: ok200('Usuário e perfil') },
  'POST /auth/change-password': {
    summary: 'Trocar a própria senha',
    description: 'A nova senha precisa respeitar o tamanho mínimo das configurações do sistema.',
    body: schemas.changePasswordSchema,
    ok: ok200('Senha alterada', ref('Mensagem')),
  },
  'POST /auth/logout': {
    summary: 'Sair (apaga o cookie de sessão)',
    ok: ok200('Sessão encerrada', ref('Mensagem')),
  },

  // ----- Agendamento público -----
  'GET /public/clinics': { summary: 'Unidades ativas', ok: ok200('Unidades', listOf('Unidade')) },
  'GET /public/catalog/specialties': {
    summary: 'Especialidades ativas da unidade',
    query: clinicIdQuery,
    ok: ok200('Especialidades', listOf('Especialidade')),
    errors: { 404: 'Unidade não encontrada ou inativa' },
  },
  'GET /public/catalog/professionals': {
    summary: 'Profissionais da unidade, com dias e horários de atendimento',
    query: clinicIdQuery,
    ok: ok200('Profissionais', listOf('Profissional')),
    errors: { 404: 'Unidade não encontrada ou inativa' },
  },
  'GET /public/availability': {
    summary: 'Horários livres do profissional numa data',
    query: schemas.publicAvailabilityQuerySchema,
    ok: ok200('Horários livres', listOf('HorarioLivre')),
    errors: { 404: 'Profissional não encontrado' },
  },
  'POST /public/appointments': {
    summary: 'Agendar sem login',
    description:
      'Cria (ou reaproveita, pelo CPF) o paciente e a consulta numa transação. Exige o aceite LGPD. Envia o resumo com convite .ics por e-mail.',
    body: schemas.publicAppointmentCreateSchema,
    ok: created('Consulta agendada', {
      type: 'object',
      properties: { appointment: ref('Consulta'), message: { type: 'string' } },
    }),
    errors: {
      404: 'Unidade, especialidade ou profissional não encontrado',
      409: 'Horário ocupado, bloqueado, fora da agenda ou no passado',
    },
  },

  // ----- Paciente -----
  'GET /patient/appointments': {
    summary: 'Minhas consultas (US007)',
    ok: ok200('Consultas', listOf('Consulta')),
  },
  'POST /patient/appointments': {
    summary: 'Agendar consulta (US001)',
    body: schemas.appointmentCreateSchema,
    ok: created('Consulta agendada', ref('Consulta')),
    errors: {
      404: 'Unidade, especialidade ou profissional não encontrado',
      409: 'Horário ocupado, bloqueado, fora da agenda ou no passado',
    },
  },
  'PATCH /patient/appointments/:id/reschedule': {
    summary: 'Remarcar consulta (US002)',
    params: idParam,
    body: schemas.rescheduleSchema,
    ok: ok200('Consulta remarcada', ref('Consulta')),
    errors: {
      404: 'Consulta não encontrada',
      409: 'Novo horário indisponível ou status não permite remarcar',
    },
  },
  'POST /patient/appointments/:id/cancel': {
    summary: 'Cancelar consulta (US003)',
    params: idParam,
    body: schemas.cancelSchema,
    ok: ok200('Consulta cancelada', ref('Consulta')),
    errors: { 404: 'Consulta não encontrada', 409: 'Consulta já cancelada ou realizada' },
  },
  'POST /patient/appointments/:id/calendar-email': {
    summary: 'Enviar a consulta por e-mail com convite de agenda (.ics)',
    params: idParam,
    ok: ok200('E-mail enviado'),
    errors: { 404: 'Consulta não encontrada', 503: 'Envio de e-mail indisponível' },
  },
  'POST /patient/appointments/:id/confirm': {
    summary: 'Confirmar presença (US014)',
    params: idParam,
    ok: ok200('Consulta confirmada', ref('Consulta')),
    errors: { 404: 'Consulta não encontrada', 409: 'Status não permite confirmar' },
  },
  'GET /patient/history': {
    summary: 'Meu histórico de atendimentos',
    ok: ok200('Consultas realizadas e faltas', listOf('Consulta')),
  },
  'GET /patient/appointments/:id/documents': {
    summary: 'Documentos da consulta',
    params: idParam,
    ok: ok200('Documentos', listOf('Documento')),
    errors: { 404: 'Consulta não encontrada' },
  },
  'GET /patient/documents/:id/download': {
    summary: 'Baixar documento (descriptografado na hora)',
    params: idParam,
    ok: ok200('Arquivo'),
    errors: { 404: 'Documento não encontrado' },
  },
  'GET /patient/profile': { summary: 'Meu perfil', ok: ok200('Perfil', ref('Paciente')) },
  'PATCH /patient/profile': {
    summary: 'Atualizar perfil e preferências de atendimento',
    body: schemas.profilePatchSchema,
    ok: ok200('Perfil atualizado', ref('Paciente')),
    errors: { 409: 'E-mail já cadastrado' },
  },
  'GET /patient/catalog/clinics': {
    summary: 'Unidades para agendar',
    ok: ok200('Unidades', listOf('Unidade')),
  },
  'GET /patient/catalog/specialties': {
    summary: 'Especialidades da unidade',
    query: clinicIdQuery,
    ok: ok200('Especialidades', listOf('Especialidade')),
    errors: { 404: 'Unidade não encontrada' },
  },
  'GET /patient/catalog/professionals': {
    summary: 'Profissionais da unidade',
    query: clinicIdQuery,
    ok: ok200('Profissionais', listOf('Profissional')),
    errors: { 404: 'Unidade não encontrada' },
  },

  // ----- Notificações -----
  'GET /notifications': { summary: 'Minhas notificações', ok: ok200('Notificações', listOf('Notificacao')) },
  'PATCH /notifications/:id/read': {
    summary: 'Marcar notificação como lida',
    params: idParam,
    ok: ok200('Notificação', ref('Notificacao')),
    errors: { 404: 'Notificação não encontrada' },
  },
  'POST /notifications/read-all': { summary: 'Marcar todas como lidas', ok: ok200('Pronto') },
  'GET /patient/notifications': {
    summary: 'Notificações do paciente: lembretes (US004), cancelamentos e remarcações (US015)',
    ok: ok200('Notificações', listOf('Notificacao')),
  },
  'PATCH /patient/notifications/:id/read': {
    summary: 'Paciente marca notificação como lida',
    params: idParam,
    ok: ok200('Notificação', ref('Notificacao')),
    errors: { 404: 'Notificação não encontrada' },
  },
  'POST /patient/notifications/read-all': { summary: 'Paciente marca todas como lidas', ok: ok200('Pronto') },

  // ----- Profissional -----
  'GET /professional/agenda': {
    summary: 'Agenda do profissional na unidade atual',
    query: dateRangeQuery,
    ok: ok200('Consultas do período', listOf('Consulta')),
  },
  'GET /professional/agenda/availability': {
    summary: 'Dias e horários de atendimento',
    ok: ok200('Disponibilidade', listOf('Disponibilidade')),
  },
  'PUT /professional/agenda/availability': {
    summary: 'Definir dias e horários de atendimento (US011)',
    body: schemas.availabilitySchema,
    ok: ok200('Disponibilidade salva', listOf('Disponibilidade')),
    errors: { 409: 'Horário inválido' },
  },
  'POST /professional/agenda/blocks': {
    summary: 'Bloquear período da agenda (US012)',
    body: schemas.blockSchema,
    ok: created('Bloqueio criado'),
    errors: { 409: 'Já existem consultas no período' },
  },
  'PATCH /professional/settings/duration': {
    summary: 'Duração padrão da consulta (US013)',
    body: schemas.durationSchema,
    ok: ok200('Duração salva'),
  },
  'GET /professional/appointments/:id': {
    summary: 'Detalhes de uma consulta da agenda',
    params: idParam,
    ok: ok200('Consulta com paciente e atendimento', ref('Consulta')),
    errors: { 404: 'Consulta não encontrada' },
  },
  'PATCH /professional/appointments/:id/no-show': {
    summary: 'Registrar falta do paciente (US018)',
    params: idParam,
    ok: ok200('Consulta marcada como FALTA', ref('Consulta')),
    errors: {
      404: 'Consulta não encontrada',
      409: 'Consulta ainda não começou, já tem atendimento ou não está ativa',
    },
  },
  'GET /professional/history': {
    summary: 'Histórico de atendimentos do profissional',
    ok: ok200('Atendimentos', listOf('Consulta')),
  },
  'GET /professional/patients/:cpf/history': {
    summary: 'Histórico de atendimentos de um paciente pelo CPF (US005)',
    params: schemas.patientCpfParam,
    ok: ok200('Histórico'),
    errors: { 404: 'Paciente não encontrado' },
  },
  'POST /professional/appointments/:id/attendance': {
    summary: 'Iniciar atendimento (US006)',
    params: idParam,
    body: schemas.attendanceCreateSchema,
    ok: created('Atendimento aberto', ref('Atendimento')),
    errors: { 404: 'Consulta não encontrada', 409: 'Consulta já possui atendimento' },
  },
  'PATCH /professional/attendances/:id/status': {
    summary: 'Avançar o status do atendimento (US017)',
    params: idParam,
    body: schemas.attendanceStatusSchema,
    ok: ok200('Atendimento atualizado', ref('Atendimento')),
    errors: { 404: 'Atendimento não encontrado', 409: 'Transição de status inválida' },
  },
  'GET /professional/appointments/:id/documents': {
    summary: 'Documentos do atendimento',
    params: idParam,
    ok: ok200('Documentos', listOf('Documento')),
    errors: { 404: 'Consulta não encontrada' },
  },
  'POST /professional/appointments/:id/documents': {
    summary: 'Anexar exame/documento (US016)',
    description:
      'Envio `multipart/form-data` com o campo `file` (PDF, JPG ou PNG, até 10 MB). O arquivo é gravado criptografado (AES-256-GCM).',
    params: idParam,
    query: schemas.documentUploadQuerySchema,
    ok: ok200('Documento anexado', {
      type: 'object',
      properties: { document: ref('Documento'), message: { type: 'string' } },
    }),
    errors: { 409: 'Atendimento não iniciado, tipo de arquivo não permitido ou arquivo grande demais' },
  },
  'GET /professional/documents/:id/download': {
    summary: 'Baixar documento (descriptografado na hora)',
    params: idParam,
    ok: ok200('Arquivo'),
    errors: { 404: 'Documento não encontrado' },
  },

  // ----- Administrador da unidade -----
  'GET /admin/dashboard': { summary: 'Indicadores da unidade', ok: ok200('Indicadores', ref('Painel')) },
  'GET /admin/users': { summary: 'Usuários da unidade', ok: ok200('Usuários', listOf('Usuario')) },
  'POST /admin/users/patients': {
    summary: 'Cadastrar paciente',
    body: schemas.patientCreateSchema,
    ok: created('Paciente cadastrado', ref('Paciente')),
    errors: { 409: 'E-mail ou CPF já cadastrado' },
  },
  'GET /admin/specialties': {
    summary: 'Especialidades da unidade',
    ok: ok200('Especialidades', listOf('Especialidade')),
  },
  'POST /admin/specialties': {
    summary: 'Cadastrar especialidade (US010)',
    body: schemas.specialtyCreateSchema,
    ok: created('Especialidade cadastrada', ref('Especialidade')),
    errors: { 409: 'Especialidade já existe' },
  },
  'GET /admin/professionals': {
    summary: 'Profissionais da unidade',
    ok: ok200('Profissionais', listOf('Profissional')),
  },
  'GET /admin/reports/absences': {
    summary: 'Relatório de faltas da unidade (US018)',
    query: dateRangeQuery,
    ok: ok200('Consultas com falta', listOf('Consulta')),
    errors: { 409: 'Intervalo inválido' },
  },
  'GET /admin/reports/productivity': {
    summary: 'Relatório de produtividade da unidade (US019)',
    query: dateRangeQuery,
    ok: ok200('Atendimentos por profissional', listOf('Produtividade')),
    errors: { 409: 'Intervalo inválido' },
  },
  'GET /admin/logs': {
    summary: 'Auditoria das ações do administrador',
    ok: ok200('Registros', listOf('RegistroDeAuditoria')),
  },
  'GET /admin/settings': {
    summary: 'Configurações do sistema (sem a senha do SMTP)',
    ok: ok200('Configurações', ref('Configuracoes')),
  },
  'PATCH /admin/settings': {
    summary: 'Alterar configurações',
    description: 'Só aceita os campos documentados; outros campos são recusados. Gera registro de auditoria.',
    body: schemas.settingsUpdateSchema,
    ok: ok200('Configurações salvas', ref('Configuracoes')),
  },

  // ----- Administrador master -----
  'GET /master/logs': {
    summary: 'Auditoria de toda a rede',
    ok: ok200('Registros', listOf('RegistroDeAuditoria')),
  },
  'GET /master/clinics': { summary: 'Unidades da rede', ok: ok200('Unidades', listOf('Unidade')) },
  'POST /master/clinics': {
    summary: 'Cadastrar unidade',
    body: schemas.masterClinicCreateSchema,
    ok: created('Unidade cadastrada', ref('Unidade')),
    errors: { 409: 'Unidade já cadastrada' },
  },
  'PATCH /master/clinics/:id': {
    summary: 'Editar ou ativar/desativar unidade',
    params: schemas.masterClinicIdParam,
    body: schemas.masterClinicUpdateSchema,
    ok: ok200('Unidade atualizada', ref('Unidade')),
    errors: { 404: 'Unidade não encontrada', 409: 'Nome já usado' },
  },
  'GET /master/professionals': {
    summary: 'Profissionais da rede',
    ok: ok200('Profissionais', listOf('Profissional')),
  },
  'POST /master/professionals': {
    summary: 'Cadastrar profissional de saúde (US009)',
    description:
      'Cria o usuário, os vínculos com as unidades e especialidades e a agenda padrão, numa transação.',
    body: schemas.masterProfessionalCreateSchema,
    ok: created('Profissional cadastrado', ref('Profissional')),
    errors: { 404: 'Unidade ou especialidade não encontrada', 409: 'E-mail ou CRM já cadastrado' },
  },
  'PATCH /master/professionals/:id': {
    summary: 'Editar profissional',
    params: idParam,
    body: schemas.masterProfessionalUpdateSchema,
    ok: ok200('Profissional atualizado', ref('Profissional')),
    errors: { 404: 'Profissional não encontrado', 409: 'E-mail ou CRM já cadastrado' },
  },
  'GET /master/specialties': {
    summary: 'Especialidades de todas as unidades',
    ok: ok200('Especialidades', listOf('Especialidade')),
  },
  'POST /master/specialties': {
    summary: 'Cadastrar especialidade numa unidade (US010)',
    body: schemas.masterSpecialtyCreateSchema,
    ok: created('Especialidade cadastrada', ref('Especialidade')),
    errors: { 404: 'Unidade não encontrada', 409: 'Especialidade já existe na unidade' },
  },
  'PATCH /master/specialties/:id': {
    summary: 'Editar especialidade',
    params: idParam,
    body: schemas.masterSpecialtyUpdateSchema,
    ok: ok200('Especialidade atualizada', ref('Especialidade')),
    errors: { 404: 'Especialidade não encontrada', 409: 'Nome já usado na unidade' },
  },
  'GET /master/administrators': {
    summary: 'Administradores das unidades',
    ok: ok200('Administradores', listOf('Administrador')),
  },
  'POST /master/administrators': {
    summary: 'Cadastrar administrador de unidade',
    body: schemas.masterAdministratorCreateSchema,
    ok: created('Administrador cadastrado', ref('Administrador')),
    errors: { 404: 'Unidade não encontrada', 409: 'E-mail já cadastrado' },
  },
  'PATCH /master/administrators/:id': {
    summary: 'Editar administrador',
    params: idParam,
    body: schemas.masterAdministratorUpdateSchema,
    ok: ok200('Administrador atualizado', ref('Administrador')),
    errors: { 404: 'Administrador não encontrado', 409: 'E-mail já cadastrado' },
  },
};
