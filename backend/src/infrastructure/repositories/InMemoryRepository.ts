import { notFound } from '../../domain/errors/DomainError.js';
import type { CrudRepository } from '../../domain/repositories/contracts.js';

/**
 * Repositório de memória utilizado exclusivamente nos testes automatizados.
 * Os IDs seguem o mesmo contrato numérico da persistência real.
 */
export class InMemoryRepository<T extends { id: number }> implements CrudRepository<T> {
  protected readonly items = new Map<number, T>();
  private sequence = 0;

  /** Cópia do estado atual, usada para desfazer uma transação que falhou. */
  snapshot(): () => void {
    const items = new Map([...this.items].map(([id, item]) => [id, structuredClone(item)]));
    const sequence = this.sequence;
    return () => {
      this.items.clear();
      for (const [id, item] of items) this.items.set(id, item);
      this.sequence = sequence;
    };
  }

  async findById(id: number) {
    return this.items.get(id);
  }

  async list() {
    return [...this.items.values()];
  }

  async create(item: Omit<T, 'id'>) {
    const id = ++this.sequence;
    const entity = { ...item, id } as T;
    this.items.set(id, entity);
    return entity;
  }

  async save(item: T) {
    this.items.set(item.id, item);
    this.sequence = Math.max(this.sequence, item.id);
    return item;
  }

  async update(id: number, patch: Partial<T>) {
    const current = this.items.get(id);
    if (!current) {
      throw notFound(`Recurso ${id} não encontrado`);
    }

    const next = { ...current, ...patch, id } as T;
    this.items.set(id, next);
    return next;
  }

  async delete(id: number) {
    this.items.delete(id);
  }
}
