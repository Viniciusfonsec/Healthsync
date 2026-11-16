export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
export const notFound = (message: string) => new DomainError('NOT_FOUND', message, 404);
export const forbidden = (message = 'Acesso negado') => new DomainError('FORBIDDEN', message, 403);
export const conflict = (message: string, details?: unknown) =>
  new DomainError('CONFLICT', message, 409, details);
export const unauthorized = (message = 'Não autenticado') => new DomainError('UNAUTHORIZED', message, 401);
