import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

type Props = {
  /** Destino fixo. Sem ele, volta uma página no histórico (ou para `fallback`). */
  to?: string;
  /** Usado quando não há histórico para voltar (ex.: página aberta direto pelo link). */
  fallback?: string;
  onClick?: () => void;
  label?: string;
  className?: string;
  disabled?: boolean;
};

/** Botão "Voltar" padrão (mesmo estilo do assistente de agendamento). */
export function BackButton({
  to,
  fallback = '/',
  onClick,
  label = 'Voltar',
  className = '',
  disabled,
}: Props) {
  const navigate = useNavigate();

  function handleClick() {
    if (onClick) {
      onClick();
      return;
    }
    if (to) {
      navigate(to);
      return;
    }
    const canGoBack = typeof window !== 'undefined' && (window.history.state?.idx ?? 0) > 0;
    if (canGoBack) navigate(-1);
    else navigate(fallback);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`btn btn-secondary ${className}`}
    >
      <ChevronLeft size={16} aria-hidden="true" /> {label}
    </button>
  );
}
