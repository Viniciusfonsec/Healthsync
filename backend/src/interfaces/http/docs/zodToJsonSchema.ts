import { z } from 'zod';

/** JSON Schema simplificado, no formato que o Swagger (OpenAPI 3) entende. */
export type JsonSchema = Record<string, unknown>;

/**
 * Converte os schemas zod usados na validação das rotas em JSON Schema para a documentação.
 * Assim a documentação vem da mesma fonte que valida as requisições e nunca fica desatualizada.
 * Cobre os tipos usados no projeto (objeto, texto, número, booleano, enum, lista, literal, opcional...).
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  const def = schema._def as { typeName: z.ZodFirstPartyTypeKind; description?: string };
  const withDescription = (json: JsonSchema) =>
    def.description ? { ...json, description: def.description } : json;

  switch (def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value as z.ZodTypeAny);
        if (!(value as z.ZodTypeAny).isOptional()) required.push(key);
      }
      return withDescription({ type: 'object', properties, ...(required.length ? { required } : {}) });
    }
    case z.ZodFirstPartyTypeKind.ZodString: {
      const json: JsonSchema = { type: 'string' };
      for (const check of (schema as z.ZodString)._def.checks) {
        if (check.kind === 'min') json.minLength = check.value;
        if (check.kind === 'max') json.maxLength = check.value;
        if (check.kind === 'email') json.format = 'email';
        if (check.kind === 'datetime') json.format = 'date-time';
        if (check.kind === 'date') json.format = 'date';
        if (check.kind === 'regex') json.pattern = check.regex.source;
      }
      return withDescription(json);
    }
    case z.ZodFirstPartyTypeKind.ZodNumber: {
      const json: JsonSchema = { type: 'number' };
      for (const check of (schema as z.ZodNumber)._def.checks) {
        if (check.kind === 'int') json.type = 'integer';
        // OpenAPI 3.0: exclusiveMinimum/exclusiveMaximum são booleanos ao lado de minimum/maximum.
        if (check.kind === 'min')
          Object.assign(json, { minimum: check.value }, check.inclusive ? {} : { exclusiveMinimum: true });
        if (check.kind === 'max')
          Object.assign(json, { maximum: check.value }, check.inclusive ? {} : { exclusiveMaximum: true });
      }
      return withDescription(json);
    }
    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return withDescription({ type: 'boolean' });
    case z.ZodFirstPartyTypeKind.ZodDate:
      return withDescription({ type: 'string', format: 'date-time' });
    case z.ZodFirstPartyTypeKind.ZodEnum:
      return withDescription({
        type: 'string',
        enum: [...(schema as z.ZodEnum<[string, ...string[]]>).options],
      });
    case z.ZodFirstPartyTypeKind.ZodLiteral: {
      const value = (schema as z.ZodLiteral<unknown>).value;
      return withDescription({ type: typeof value, enum: [value] });
    }
    case z.ZodFirstPartyTypeKind.ZodArray: {
      const array = schema as z.ZodArray<z.ZodTypeAny>;
      const json: JsonSchema = { type: 'array', items: zodToJsonSchema(array.element) };
      if (array._def.minLength) json.minItems = array._def.minLength.value;
      if (array._def.maxLength) json.maxItems = array._def.maxLength.value;
      return withDescription(json);
    }
    case z.ZodFirstPartyTypeKind.ZodOptional:
    case z.ZodFirstPartyTypeKind.ZodNullable:
      return zodToJsonSchema((schema as z.ZodOptional<z.ZodTypeAny>).unwrap());
    case z.ZodFirstPartyTypeKind.ZodDefault: {
      const inner = (schema as z.ZodDefault<z.ZodTypeAny>)._def;
      return { ...zodToJsonSchema(inner.innerType), default: inner.defaultValue() };
    }
    case z.ZodFirstPartyTypeKind.ZodEffects:
      return withDescription(zodToJsonSchema((schema as z.ZodEffects<z.ZodTypeAny>).innerType()));
    case z.ZodFirstPartyTypeKind.ZodUnion:
      return withDescription({
        anyOf: (schema as z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>).options.map(zodToJsonSchema),
      });
    case z.ZodFirstPartyTypeKind.ZodRecord:
      return withDescription({ type: 'object', additionalProperties: true });
    default:
      return withDescription({});
  }
}
