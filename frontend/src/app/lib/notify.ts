import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Exibe o erro em pop-up fixo no topo da janela (visível mesmo que a caixa de
 * erro da página esteja fora do enquadramento). O `id` é a própria mensagem:
 * se o mesmo erro for disparado pela camada de API e pela página, aparece um
 * único pop-up.
 */
export function notifyError(message: string) {
  if (!message) return;
  toast.error(message, { id: message, duration: 8000 });
}

/** Mostra em pop-up toda mensagem de erro que a página guardar no estado `error`. */
export function useErrorToast(error: string | null | undefined) {
  useEffect(() => {
    if (error) notifyError(error);
  }, [error]);
}
