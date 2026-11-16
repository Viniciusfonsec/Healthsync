import type { FastifyReply, FastifyRequest } from 'fastify';
import { forbidden, unauthorized } from '../../../domain/errors/DomainError.js';
import type { Role } from '../../../domain/entities/types.js';
import { CSRF_HEADER, CSRF_VALUE, readSessionCookie } from '../session/sessionCookie.js';

export interface AuthUser {
  userId: number;
  clinicId: number;
  role: Role;
  email: string;
  stage?: 'ACCESS' | 'CLINIC_SELECTION';
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Aceita a sessão do cookie httpOnly (navegador) ou o token Bearer (Swagger, testes, integrações).
 * Com cookie, as requisições que alteram dados precisam do cabeçalho X-Requested-With (proteção CSRF).
 */
export async function requireAuth(request: FastifyRequest) {
  if (request.headers.authorization) {
    try {
      await request.jwtVerify();
    } catch {
      throw unauthorized();
    }
  } else {
    const token = readSessionCookie(request);
    if (!token) throw unauthorized();
    try {
      request.user = request.server.jwt.verify<AuthUser>(token);
    } catch {
      throw unauthorized('Sessão expirada. Entre novamente.');
    }
    if (!SAFE_METHODS.has(request.method) && request.headers[CSRF_HEADER] !== CSRF_VALUE) {
      throw forbidden('Requisição recusada pela proteção contra CSRF.');
    }
  }
  const user = request.user as AuthUser;
  if (user.stage === 'CLINIC_SELECTION')
    throw unauthorized('Sessão de seleção de unidade expirada ou inválida.');
}

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    await requireAuth(request);
    const user = request.user as AuthUser;
    if (!roles.includes(user.role)) throw forbidden();
  };
}
