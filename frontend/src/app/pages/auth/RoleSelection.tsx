import { Navigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

function homeForRole(role: string) {
  if (role === 'PACIENTE') return '/patient/dashboard';
  if (role === 'PROFISSIONAL') return '/professional/dashboard';
  if (role === 'ADMIN_MASTER') return '/master/dashboard';
  if (role === 'ADMINISTRADOR') return '/admin/dashboard';
  return '/login';
}

export function RoleSelection() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRole(user.role)} replace />;
}
