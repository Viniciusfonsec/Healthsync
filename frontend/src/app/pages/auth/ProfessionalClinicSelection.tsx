import { useErrorToast } from '../../lib/notify';
import { BackButton } from '../../components/BackButton';
import { useState } from 'react';
import { Building2, CheckCircle2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export function ProfessionalClinicSelection() {
  const navigate = useNavigate();
  const { pendingProfessionalLogin, selectProfessionalClinic, logout } = useAuth();
  const [clinicId, setClinicId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useErrorToast(error);

  if (!pendingProfessionalLogin) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-900">Seleção de unidade indisponível</h2>
        <p className="mt-2 text-sm text-slate-500">
          Sua sessão de autenticação expirou. Faça login novamente.
        </p>
        <BackButton
          className="mt-5"
          label="Voltar ao login"
          onClick={() => navigate('/login', { replace: true })}
        />
      </div>
    );
  }

  async function handleContinue() {
    if (!clinicId) {
      setError('Selecione a unidade em que deseja trabalhar.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const session = await selectProfessionalClinic(clinicId);
      navigate(session.user.role === 'PROFISSIONAL' ? '/professional/dashboard' : '/login', {
        replace: true,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível selecionar a unidade.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="text-center mb-6">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Building2 size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Escolha sua unidade</h2>
        <p className="mt-1 text-sm text-slate-500">
          Selecione a unidade em que deseja visualizar sua agenda e realizar os atendimentos.
        </p>
      </div>

      {error && (
        <div
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="space-y-3" role="radiogroup" aria-label="Filiais disponíveis">
        {pendingProfessionalLogin.clinics.map((clinic) => {
          const selected = clinic.id === clinicId;
          return (
            <button
              key={clinic.id}
              type="button"
              onClick={() => setClinicId(clinic.id)}
              role="radio"
              aria-checked={selected}
              className={`w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? 'border-primary bg-primary/5 ring-2 ring-primary/10' : 'border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50'}`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                <Building2 size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-900">{clinic.name}</span>
                <span className="block text-xs text-slate-500">Contexto de trabalho</span>
              </span>
              {selected && <CheckCircle2 className="text-primary" size={22} />}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={handleContinue}
        className="btn btn-primary mt-6 w-full"
      >
        {loading ? 'Acessando...' : 'Acessar unidade'}
      </button>

      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        onClick={() => {
          logout();
          navigate('/login', { replace: true });
        }}
      >
        <LogOut size={16} />
        Cancelar e voltar ao login
      </button>
    </div>
  );
}
