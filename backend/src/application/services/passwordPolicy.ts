import { DomainError } from '../../domain/errors/DomainError.js';
import type { Repositories } from '../../domain/repositories/contracts.js';

/** Aplica o tamanho mínimo de senha definido nas configurações do sistema. */
export async function ensurePasswordPolicy(repos: Repositories, password: string): Promise<void> {
  const { minPasswordLength } = await repos.settings.get();
  const minimum = Math.max(8, minPasswordLength || 8);
  if (password.length < minimum) {
    throw new DomainError('VALIDATION_ERROR', `A senha deve ter pelo menos ${minimum} caracteres.`, 422, {
      fieldErrors: { password: [`Mínimo de ${minimum} caracteres`] },
    });
  }
}
