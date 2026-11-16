import type { Repositories } from '../../domain/repositories/contracts.js';

const DAY = 24 * 60 * 60 * 1000;

/** Apaga os registros de auditoria mais antigos que "Guardar auditoria por (dias)" nas configurações. */
export class AuditRetentionJob {
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly repositories: Repositories,
    private readonly intervalMs = 6 * 60 * 60 * 1000,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.run(), this.intervalMs);
    void this.run();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Devolve quantos registros foram apagados. */
  async run(now = new Date()): Promise<number> {
    const { logRetentionDays } = await this.repositories.settings.get();
    if (!logRetentionDays || logRetentionDays < 1) return 0;
    return this.repositories.auditLogs.deleteOlderThan(new Date(now.getTime() - logRetentionDays * DAY));
  }
}
