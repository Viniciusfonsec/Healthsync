import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  isClinicSelectionChallenge,
  login as loginRequest,
  logout as logoutRequest,
  SESSION_EXPIRED_EVENT,
  me as meRequest,
  selectProfessionalClinic as selectProfessionalClinicRequest,
  switchProfessionalClinic as switchProfessionalClinicRequest,
  type ProfessionalLoginChallenge,
  type Session,
  type SessionUser,
} from '../lib/api';

interface AuthContextValue {
  session: Session | null;
  user: SessionUser | null;
  isAuthenticated: boolean;
  pendingProfessionalLogin: ProfessionalLoginChallenge | null;
  login: (email: string, password: string) => Promise<Session | ProfessionalLoginChallenge>;
  selectProfessionalClinic: (clinicId: string) => Promise<Session>;
  switchProfessionalClinic: (clinicId: string) => Promise<Session>;
  refreshUser: () => Promise<
    SessionUser & { active?: boolean; profile?: unknown; clinics?: SessionUser['availableClinics'] }
  >;
  logout: () => void;
}

const PENDING_KEY = 'healthsync.professionalClinicSelection';
const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'healthsync.session';

/** Dados de exibição do usuário (o token fica no cookie httpOnly, fora do alcance do JavaScript). */
function readSession(): Session | null {
  // Versões anteriores guardavam o token aqui: removido por segurança.
  localStorage.removeItem('healthsync.accessToken');
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Session & { accessToken?: string };
    if (!parsed?.user) throw new Error('sessão inválida');
    const { accessToken: _legacy, ...session } = parsed;
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function readPending(): ProfessionalLoginChallenge | null {
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProfessionalLoginChallenge;
  } catch {
    sessionStorage.removeItem(PENDING_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession);
  const [pendingProfessionalLogin, setPendingProfessionalLogin] = useState<ProfessionalLoginChallenge | null>(
    readPending,
  );

  function clearLocalSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    setPendingProfessionalLogin(null);
    setSession(null);
  }

  // Ao abrir o sistema, confirma com o servidor se o cookie de sessão ainda vale.
  useEffect(() => {
    if (!readSession()) return;
    meRequest().catch(() => clearLocalSession());
  }, []);

  // Qualquer 401 numa área logada encerra a sessão local (o roteador leva para o login).
  useEffect(() => {
    const onExpired = () => clearLocalSession();
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  function persistSession(next: Session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ expiresIn: next.expiresIn, user: next.user }));
    sessionStorage.removeItem(PENDING_KEY);
    setPendingProfessionalLogin(null);
    setSession(next);
  }

  async function login(email: string, password: string) {
    const result = await loginRequest(email, password);

    if (isClinicSelectionChallenge(result)) {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(result));
      setPendingProfessionalLogin(result);
      return result;
    }

    persistSession(result);
    return result;
  }

  async function selectProfessionalClinic(clinicId: string) {
    if (!pendingProfessionalLogin) {
      throw new Error('A sessão de seleção de unidade não está disponível.');
    }
    const next = await selectProfessionalClinicRequest(pendingProfessionalLogin.selectionToken, clinicId);
    persistSession(next);
    return next;
  }

  async function switchProfessionalClinic(clinicId: string) {
    const next = await switchProfessionalClinicRequest(clinicId);
    persistSession(next);
    return next;
  }

  async function refreshUser() {
    const current = await meRequest();
    if (session) {
      const next = {
        ...session,
        user: {
          ...session.user,
          ...current,
          availableClinics: current.clinics ?? session.user.availableClinics,
        },
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setSession(next);
    }
    return current;
  }

  function logout() {
    void logoutRequest().catch(() => undefined);
    clearLocalSession();
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.user),
      pendingProfessionalLogin,
      login,
      selectProfessionalClinic,
      switchProfessionalClinic,
      refreshUser,
      logout,
    }),
    [session, pendingProfessionalLogin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return value;
}
