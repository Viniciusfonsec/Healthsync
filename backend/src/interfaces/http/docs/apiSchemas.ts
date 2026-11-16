import type { JsonSchema } from './zodToJsonSchema.js';

/** Schemas das respostas, publicados em components/schemas do Swagger e referenciados pelas rotas. */

const id = { type: 'integer', example: 1 };
const isoDate = { type: 'string', format: 'date-time', example: '2026-11-16T13:00:00.000Z' };
const text = { type: 'string' };

const address: JsonSchema = {
  type: 'object',
  properties: {
    cep: text,
    street: text,
    number: text,
    complement: text,
    district: text,
    city: text,
    state: text,
  },
};

export const apiSchemas: Record<string, JsonSchema> = {
  Erro: {
    type: 'object',
    description: 'Formato de todos os erros da API.',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Dados inválidos' },
          requestId: { type: 'string', example: 'req-12' },
          details: { type: 'object', description: 'Erros por campo (validação)', additionalProperties: true },
        },
        required: ['code', 'message'],
      },
    },
  },
  Mensagem: { type: 'object', properties: { message: { type: 'string', example: 'Operação concluída' } } },
  Sessao: {
    type: 'object',
    description:
      'Sessão aberta. No navegador o token vai no cookie httpOnly `hs_session`; `accessToken` só vem com o cabeçalho `x-auth-mode: token`.',
    properties: {
      accessToken: { type: 'string', description: 'Somente com `x-auth-mode: token`' },
      tokenType: { type: 'string', example: 'Bearer' },
      expiresIn: { type: 'integer', description: 'Segundos até expirar', example: 21600 },
      user: {
        type: 'object',
        properties: {
          name: text,
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['PACIENTE', 'PROFISSIONAL', 'ADMINISTRADOR', 'ADMIN_MASTER'] },
          clinicId: id,
          availableClinics: { type: 'array', items: { type: 'object', properties: { id, name: text } } },
        },
      },
    },
  },
  EscolhaDeUnidade: {
    type: 'object',
    description:
      'Profissional autenticado: precisa escolher a unidade de trabalho em /auth/professional/select-clinic.',
    properties: {
      requiresClinicSelection: { type: 'boolean', enum: [true] },
      selectionToken: { type: 'string', description: 'Vale 10 minutos' },
      clinics: { type: 'array', items: { type: 'object', properties: { id, name: text } } },
    },
  },
  Unidade: {
    type: 'object',
    properties: {
      id,
      name: { type: 'string', example: 'HealthSync Clínica Demo' },
      document: text,
      phone: text,
      email: text,
      address,
      active: { type: 'boolean' },
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },
  Especialidade: {
    type: 'object',
    properties: {
      id,
      clinicId: id,
      name: { type: 'string', example: 'Cardiologia' },
      description: text,
      icon: text,
      avgMinutes: { type: 'integer', example: 30 },
      active: { type: 'boolean' },
    },
  },
  Disponibilidade: {
    type: 'object',
    properties: {
      dayOfWeek: { type: 'integer', minimum: 0, maximum: 6, description: '0 = domingo' },
      startTime: { type: 'string', example: '08:00' },
      endTime: { type: 'string', example: '17:00' },
      durationMinutes: { type: 'integer', example: 30 },
    },
  },
  Profissional: {
    type: 'object',
    properties: {
      id,
      clinicId: id,
      name: { type: 'string', example: 'Dr. Carlos Matos' },
      email: text,
      phone: text,
      crm: { type: 'string', example: 'CRM-DF 12345' },
      specialties: { type: 'array', items: id },
      consultationDurationMinutes: { type: 'integer', example: 30 },
      active: { type: 'boolean' },
      availability: { type: 'array', items: { $ref: '#/components/schemas/Disponibilidade' } },
    },
  },
  HorarioLivre: {
    type: 'object',
    properties: { dateTime: isoDate, durationMinutes: { type: 'integer', example: 30 } },
  },
  Consulta: {
    type: 'object',
    properties: {
      id,
      clinicId: id,
      patientId: id,
      professionalId: id,
      specialtyId: id,
      dateTime: isoDate,
      durationMinutes: { type: 'integer', example: 30 },
      type: { type: 'string', enum: ['PRESENCIAL', 'TELEMEDICINA'] },
      location: { type: 'string', example: 'Consultório' },
      status: { type: 'string', enum: ['AGENDADA', 'CONFIRMADA', 'REALIZADA', 'CANCELADA', 'FALTA'] },
      insuranceUsed: { type: 'boolean' },
      insuranceProvider: text,
      insuranceMemberNumber: text,
      teleconsultationUrl: { type: 'string', description: 'Só em TELEMEDICINA' },
      notes: text,
      cancellationReason: text,
      confirmedAt: isoDate,
      createdAt: isoDate,
      updatedAt: isoDate,
    },
  },
  Atendimento: {
    type: 'object',
    properties: {
      id,
      appointmentId: id,
      professionalId: id,
      status: { type: 'string', enum: ['ABERTO', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO'] },
      notes: text,
      diagnosis: text,
      prescription: text,
      startedAt: isoDate,
      finishedAt: isoDate,
    },
  },
  Documento: {
    type: 'object',
    properties: {
      id,
      fileName: { type: 'string', example: 'exame.pdf' },
      type: { type: 'string', enum: ['EXAME', 'DOCUMENTO', 'PRESCRICAO', 'OUTRO'] },
      mimeType: text,
      size: { type: 'integer' },
      createdAt: isoDate,
    },
  },
  Notificacao: {
    type: 'object',
    properties: {
      id,
      patientId: id,
      userId: id,
      appointmentId: id,
      type: { type: 'string', enum: ['CONSULTA', 'LEMBRETE', 'RESULTADO', 'SISTEMA', 'MENSAGEM'] },
      channel: { type: 'string', enum: ['WHATSAPP', 'EMAIL', 'IN_APP'] },
      content: { type: 'string', example: 'Consulta agendada para 16/11/2026 às 10:00' },
      status: { type: 'string', enum: ['PENDENTE', 'ENVIADO', 'ERRO', 'CANCELADO'] },
      readAt: isoDate,
      sentAt: isoDate,
      createdAt: isoDate,
    },
  },
  Paciente: {
    type: 'object',
    properties: {
      id,
      name: text,
      email: text,
      phone: text,
      cpf: { type: 'string', example: '52998224725' },
      birthDate: { type: 'string', format: 'date' },
      gender: text,
      bloodType: text,
      plan: text,
      address,
      priorities: {
        type: 'array',
        items: { type: 'string', enum: ['IDOSO', 'GESTANTE', 'PESSOA_COM_DEFICIENCIA'] },
      },
    },
  },
  Usuario: {
    type: 'object',
    properties: {
      id,
      name: text,
      email: text,
      role: { type: 'string' },
      active: { type: 'boolean' },
      createdAt: isoDate,
    },
  },
  Administrador: {
    type: 'object',
    properties: { id, userId: id, name: text, email: text, clinicId: id, active: { type: 'boolean' } },
  },
  RegistroDeAuditoria: {
    type: 'object',
    properties: {
      id,
      actorUserId: id,
      action: { type: 'string', example: 'UPDATE' },
      resource: { type: 'string', example: 'SystemSettings' },
      resourceId: id,
      createdAt: isoDate,
    },
  },
  Configuracoes: {
    type: 'object',
    properties: {
      systemName: text,
      timezone: { type: 'string', example: 'America/Sao_Paulo' },
      language: text,
      dateFormat: text,
      sessionTimeoutMinutes: { type: 'integer', example: 360 },
      logRetentionDays: { type: 'integer', example: 90 },
      minPasswordLength: { type: 'integer', example: 8 },
      primaryColor: { type: 'string', example: '#234B65' },
      theme: { type: 'string', enum: ['light', 'dark', 'system'] },
      compactMode: { type: 'boolean' },
      smtp: {
        type: 'object',
        properties: {
          host: text,
          port: { type: 'integer' },
          tls: { type: 'boolean' },
          user: text,
          hasPassword: { type: 'boolean' },
        },
      },
    },
  },
  Produtividade: {
    type: 'object',
    properties: {
      professionalId: id,
      professionalName: text,
      totalAttendances: { type: 'integer' },
      finished: { type: 'integer' },
    },
  },
  Painel: {
    type: 'object',
    description: 'Indicadores do painel do administrador.',
    additionalProperties: true,
  },
};

/** `{ data: [...] }` com itens do schema informado. */
export const listOf = (name: string): JsonSchema => ({
  type: 'object',
  properties: { data: { type: 'array', items: { $ref: `#/components/schemas/${name}` } } },
});

export const ref = (name: string): JsonSchema => ({ $ref: `#/components/schemas/${name}` });
