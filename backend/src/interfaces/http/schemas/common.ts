import { z } from 'zod';
export const idParam = z.object({ id: z.coerce.number().int().positive() });
export const dateRangeQuery = z
  .object({ from: z.coerce.date(), to: z.coerce.date() })
  .refine((v) => v.from <= v.to, { message: 'from deve ser menor ou igual a to' });

/** ?clinicId=... obrigatório nas consultas de catálogo. */
export const clinicIdQuery = z.object({ clinicId: z.coerce.number().int().positive() });
