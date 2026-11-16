import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../../config/env.js';

/**
 * Sessão do navegador em cookie httpOnly: o JavaScript da página não consegue ler o token,
 * o que protege a sessão contra roubo por XSS. Integrações, Swagger e testes podem usar
 * o token Bearer (pedido com o cabeçalho `x-auth-mode: token` no login).
 */
export const SESSION_COOKIE = 'hs_session';

/** Cabeçalho exigido nas requisições que alteram dados quando a sessão vem do cookie (proteção CSRF). */
export const CSRF_HEADER = 'x-requested-with';
export const CSRF_VALUE = 'HealthSync';

function serialize(name: string, value: string, maxAgeSeconds: number): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (env.COOKIE_SECURE) parts.push('Secure');
  return parts.join('; ');
}

export function setSessionCookie(reply: FastifyReply, token: string, maxAgeSeconds: number): void {
  reply.header('set-cookie', serialize(SESSION_COOKIE, token, maxAgeSeconds));
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.header('set-cookie', serialize(SESSION_COOKIE, '', 0));
}

export function readSessionCookie(request: FastifyRequest): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === SESSION_COOKIE) {
      const value = decodeURIComponent(part.slice(index + 1).trim());
      return value || undefined;
    }
  }
  return undefined;
}

/**
 * O cliente quer o token no corpo da resposta? Sim quando pede (`x-auth-mode: token`)
 * ou quando já está usando token Bearer (ex.: troca de unidade feita por uma integração).
 */
export function wantsBearerToken(request: FastifyRequest): boolean {
  return (
    request.headers['x-auth-mode'] === 'token' ||
    Boolean(request.headers.authorization?.startsWith('Bearer '))
  );
}
