import { useErrorToast } from '../../lib/notify';
import { BackButton } from '../../components/BackButton';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Mail, Lock, ArrowRight, CalendarPlus } from 'lucide-react';
import { ApiError, isClinicSelectionChallenge } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

function homeForRole(role: string) {
  if (role === 'PACIENTE') return '/patient/dashboard';
  if (role === 'PROFISSIONAL') return '/professional/dashboard';
  if (role === 'ADMIN_MASTER') return '/master/dashboard';
  if (role === 'ADMINISTRADOR') return '/admin/dashboard';
  return '/login';
}

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  useErrorToast(error);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (isClinicSelectionChallenge(result)) {
        navigate('/professional/select-clinic', { replace: true });
        return;
      }
      navigate(homeForRole(result.user.role), { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível entrar. Verifique suas credenciais e tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <BackButton to="/" label="Voltar ao início" />
      </div>

      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Bem-vindo(a)</h2>
        <p className="text-slate-500 mt-1 text-sm">
          Faça login para acessar sua conta. Profissionais escolherão a unidade de trabalho depois da
          autenticação.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
            E-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900"
              placeholder="seu@email.com"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1.5">
            Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
          {loading ? 'Entrando...' : 'Entrar'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <div className="mt-5 text-center">
        <button type="button" onClick={() => navigate('/agendamento')} className="btn btn-secondary w-full">
          <CalendarPlus size={17} aria-hidden="true" />
          Agendar uma consulta sem fazer login
        </button>
      </div>
    </div>
  );
}
