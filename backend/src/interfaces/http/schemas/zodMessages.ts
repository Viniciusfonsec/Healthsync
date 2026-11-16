import { z, ZodIssueCode, type ZodErrorMap } from 'zod';

const TYPES: Record<string, string> = {
  string: 'texto',
  number: 'número',
  nan: 'número',
  boolean: 'verdadeiro ou falso',
  date: 'data',
  array: 'lista',
  object: 'objeto',
  undefined: 'vazio',
  null: 'vazio',
};

/** Mensagens de validação em português (aparecem em `error.details` das respostas 422). */
export const ptBrErrorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') return { message: 'Obrigatório' };
      if (issue.received === 'nan') return { message: 'Deve ser um número' };
      return {
        message: `Esperado ${TYPES[issue.expected] ?? issue.expected}, recebido ${TYPES[issue.received] ?? issue.received}`,
      };
    case ZodIssueCode.invalid_date:
      return { message: 'Data inválida' };
    case ZodIssueCode.invalid_enum_value:
      return { message: `Valor inválido. Use: ${issue.options.join(', ')}` };
    case ZodIssueCode.unrecognized_keys:
      return { message: `Campo não permitido: ${issue.keys.join(', ')}` };
    case ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'E-mail inválido' };
      if (issue.validation === 'datetime') return { message: 'Data e hora inválidas' };
      return { message: 'Formato inválido' };
    case ZodIssueCode.too_small:
      if (issue.type === 'string') return { message: `Mínimo de ${issue.minimum} caracteres` };
      if (issue.type === 'array') return { message: `Escolha pelo menos ${issue.minimum}` };
      return { message: `Deve ser ${issue.inclusive ? 'no mínimo' : 'maior que'} ${issue.minimum}` };
    case ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `Máximo de ${issue.maximum} caracteres` };
      if (issue.type === 'array') return { message: `Escolha no máximo ${issue.maximum}` };
      return { message: `Deve ser ${issue.inclusive ? 'no máximo' : 'menor que'} ${issue.maximum}` };
    case ZodIssueCode.not_multiple_of:
      return { message: `Deve ser múltiplo de ${issue.multipleOf}` };
    default:
      return { message: ctx.defaultError };
  }
};

z.setErrorMap(ptBrErrorMap);
