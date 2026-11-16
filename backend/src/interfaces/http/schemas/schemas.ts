import { z } from 'zod';
function isValidCpf(value: string): boolean {
  const cpf = value.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (base: string, factor: number) => {
    let total = 0;
    for (const character of base) total += Number(character) * factor--;
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  const first = digit(cpf.slice(0, 9), 10);
  const second = digit(cpf.slice(0, 10), 11);
  return first === Number(cpf[9]) && second === Number(cpf[10]);
}

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
});
export const professionalClinicSelectionSchema = z.object({
  selectionToken: z.string().min(1),
  clinicId: z.coerce.number().int().positive(),
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});
export const appointmentCreateSchema = z
  .object({
    clinicId: z.coerce.number().int().positive(),

    professionalId: z.coerce.number().int().positive(),

    specialtyId: z.coerce.number().int().positive(),

    dateTime: z.string().datetime(),

    durationMinutes: z.number().int().min(5).max(240),
    insuranceUsed: z.boolean().optional().default(false),
    insuranceProvider: z.string().trim().max(120).optional(),
    insuranceMemberNumber: z.string().trim().max(80).optional(),

    type: z.enum(['PRESENCIAL', 'TELEMEDICINA']),

    location: z.string().min(2).max(200),
  })
  .refine((value) => !value.insuranceUsed || Boolean(value.insuranceProvider?.trim()), {
    message: 'Informe a operadora do convênio quando optar por utilizá-lo.',
    path: ['insuranceProvider'],
  });
export const rescheduleSchema = z.object({ dateTime: z.string().datetime() });
export const cancelSchema = z.object({ reason: z.string().min(3).max(300) });
export const availabilitySchema = z.object({
  slots: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      durationMinutes: z.number().int().min(5).max(240),
    }),
  ),
});
export const blockSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().min(2).max(200),
});
export const durationSchema = z.object({ minutes: z.number().int().min(5).max(240) });
export const attendanceCreateSchema = z.object({
  notes: z.string().max(5000).optional(),
  diagnosis: z.string().max(5000).optional(),
  prescription: z.string().max(5000).optional(),
});
export const attendanceStatusSchema = z.object({
  status: z.enum(['ABERTO', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO']),
});
export const patientPrioritiesSchema = z
  .array(z.enum(['IDOSO', 'GESTANTE', 'PESSOA_COM_DEFICIENCIA']))
  .max(3)
  .transform((items) => Array.from(new Set(items)));

export const patientCreateSchema = z.object({
  priorities: patientPrioritiesSchema.optional(),
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(8).max(30),
  cpf: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .refine(isValidCpf, { message: 'Informe um CPF válido' }),
  birthDate: z.string().trim().min(1),
  gender: z.string().trim().min(1),
  bloodType: z.string().trim().optional(),
  plan: z.string().trim().optional(),
  password: z.string().min(8),
});
export const specialtyCreateSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  icon: z.string().optional(),
  avgMinutes: z.number().int().min(5).max(240),
});
export const profilePatchSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  bloodType: z.string().optional(),
  plan: z.string().optional(),
  priorities: patientPrioritiesSchema.optional(),
  address: z
    .object({
      cep: z.string(),
      street: z.string(),
      number: z.string(),
      complement: z.string().optional(),
      district: z.string(),
      city: z.string(),
      state: z.string(),
    })
    .optional(),
});

export const masterClinicCreateSchema = z.object({
  name: z.string().min(2).max(150),
  document: z.string().max(30).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  address: z
    .object({
      cep: z.string(),
      street: z.string(),
      number: z.string(),
      complement: z.string().optional(),
      district: z.string(),
      city: z.string(),
      state: z.string(),
    })
    .optional(),
});

export const masterClinicUpdateSchema = masterClinicCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

export const masterClinicIdParam = z.object({
  id: z.coerce.number().int().positive(),
});
export const masterProfessionalCreateSchema = z.object({
  clinicId: z.coerce.number().int().positive(),
  clinicIds: z.array(z.coerce.number().int().positive()).optional(),
  allClinics: z.boolean().optional(),
  name: z.string().min(2).max(150),
  email: z.string().email(),
  phone: z.string().min(8).max(30),
  crm: z.string().min(2).max(50),
  specialties: z.array(z.coerce.number().int().positive()).default([]),
  consultationDurationMinutes: z.number().int().min(5).max(240),
  password: z.string().min(8),
});

export const masterProfessionalUpdateSchema = masterProfessionalCreateSchema
  .omit({ password: true })
  .partial()
  .extend({
    active: z.boolean().optional(),
  });

export const masterSpecialtyCreateSchema = z.object({
  clinicId: z.coerce.number().int().positive(),
  name: z.string().min(2).max(150),
  description: z.string().optional(),
  icon: z.string().optional(),
  avgMinutes: z.number().int().min(5).max(240),
});

export const masterSpecialtyUpdateSchema = masterSpecialtyCreateSchema
  .omit({
    clinicId: true,
  })
  .partial()
  .extend({
    clinicId: z.coerce.number().int().positive().optional(),
    active: z.boolean().optional(),
  });

export const masterAdministratorCreateSchema = z.object({
  clinicId: z.coerce.number().int().positive(),
  name: z.string().min(2).max(150),
  email: z.string().email(),
  password: z.string().min(8),
});

export const masterAdministratorUpdateSchema = masterAdministratorCreateSchema
  .omit({
    password: true,
  })
  .partial()
  .extend({
    active: z.boolean().optional(),
  });

export const publicAvailabilityQuerySchema = z.object({
  professionalId: z.coerce.number().int().positive(),
  date: z.string().date(),
});
export const publicAppointmentCreateSchema = z
  .object({
    priorities: patientPrioritiesSchema.optional(),
    clinicId: z.coerce.number().int().positive(),
    professionalId: z.coerce.number().int().positive(),
    specialtyId: z.coerce.number().int().positive(),
    dateTime: z.string().datetime(),
    durationMinutes: z.number().int().min(5).max(240),
    type: z.enum(['PRESENCIAL', 'TELEMEDICINA']),
    location: z.string().min(2).max(200),
    name: z.string().min(2).max(150),
    email: z.string().trim().toLowerCase().email(),
    phone: z.string().min(8).max(30),
    cpf: z
      .string()
      .transform((value) => value.replace(/\D/g, ''))
      .refine(isValidCpf, 'Informe um CPF válido'),
    birthDate: z.string().date(),
    gender: z.string().min(2).max(30),
    lgpdConsentAccepted: z.literal(true, {
      errorMap: () => ({
        message: 'É necessário aceitar o compartilhamento de dados para concluir o agendamento.',
      }),
    }),
    notes: z.string().max(1000).optional(),
    insuranceUsed: z.boolean().optional().default(false),
    insuranceProvider: z.string().trim().max(120).optional(),
    insuranceMemberNumber: z.string().trim().max(80).optional(),
  })
  .refine((value) => !value.insuranceUsed || Boolean(value.insuranceProvider?.trim()), {
    message: 'Informe a operadora do convênio quando optar por utilizá-lo.',
    path: ['insuranceProvider'],
  });

export const documentUploadQuerySchema = z.object({
  type: z.enum(['EXAME', 'DOCUMENTO', 'PRESCRICAO', 'OUTRO']).default('DOCUMENTO'),
});

/** Fuso horário IANA válido (ex.: America/Sao_Paulo). */
const timeZoneSchema = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, 'Fuso horário inválido');

/** Configurações que o administrador pode alterar; campos desconhecidos são recusados. */
export const settingsUpdateSchema = z
  .object({
    systemName: z.string().trim().min(2).max(80).optional(),
    timezone: timeZoneSchema.optional(),
    language: z.enum(['pt-BR', 'en-US', 'es-ES']).optional(),
    dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
    sessionTimeoutMinutes: z.number().int().min(5).max(1440).optional(),
    logRetentionDays: z.number().int().min(1).max(3650).optional(),
    minPasswordLength: z.number().int().min(8).max(64).optional(),
    primaryColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    compactMode: z.boolean().optional(),
  })
  .strict();

export const patientCpfParam = z.object({
  cpf: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .refine(isValidCpf, 'Informe um CPF válido'),
});
