import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ação destrutiva (desativar, registrar falta): botão de confirmar em vermelho. */
  danger?: boolean;
};

type Pending = ConfirmOptions & { resolve: (confirmed: boolean) => void };

/**
 * Confirmação no estilo do sistema, no lugar do `window.confirm` do navegador.
 *
 *   const [confirm, confirmDialog] = useConfirm();
 *   if (!(await confirm({ message: 'Deseja desativar?' }))) return;
 *   ...
 *   return <>{...}{confirmDialog}</>;
 */
export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );

  const close = useCallback(
    (confirmed: boolean) => {
      pending?.resolve(confirmed);
      setPending(null);
    },
    [pending],
  );

  return [confirm, pending ? <ConfirmDialog {...pending} onClose={close} /> : null];
}

function ConfirmDialog({
  title = 'Confirmar ação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onClose,
}: ConfirmOptions & { onClose: (confirmed: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Foco no "Cancelar": Enter por engano não confirma uma ação destrutiva.
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={() => onClose(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-slate-900">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="mt-2 text-sm text-slate-600">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button ref={cancelRef} type="button" className="btn btn-secondary" onClick={() => onClose(false)}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger-solid' : 'btn-primary'}`}
            onClick={() => onClose(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
