import { createBrowserRouter, Navigate } from 'react-router';
import { AuthLayout } from './components/layouts/AuthLayout';
import { MainLayout } from './components/layouts/MainLayout';

import { Login } from './pages/auth/Login';
import { HomePage } from './pages/auth/HomePage';
import { PublicSchedule } from './pages/auth/PublicSchedule';
import { ClinicHome } from './pages/auth/ClinicHome';
import { RoleSelection } from './pages/auth/RoleSelection';
import { ProfessionalClinicSelection } from './pages/auth/ProfessionalClinicSelection';

import { PatientDashboard } from './pages/patient/PatientDashboard';
import { PatientSchedule } from './pages/patient/PatientSchedule';
import { PatientAppointments } from './pages/patient/PatientAppointments';
import { PatientHistory } from './pages/patient/PatientHistory';
import { NotificationsCenter } from './pages/NotificationsCenter';
import { PatientProfile } from './pages/patient/PatientProfile';

import { ProfessionalDashboard } from './pages/professional/ProfessionalDashboard';
import { ProfessionalAgenda } from './pages/professional/ProfessionalAgenda';
import { ProfessionalPatientsToday } from './pages/professional/ProfessionalPatientsToday';
import { ProfessionalConsultation } from './pages/professional/ProfessionalConsultation';
import { ProfessionalHistory } from './pages/professional/ProfessionalHistory';
import { ProfessionalSettings } from './pages/professional/ProfessionalSettings';

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminProfessionals } from './pages/admin/AdminProfessionals';
import { AdminSpecialties } from './pages/admin/AdminSpecialties';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminLogs } from './pages/admin/AdminLogs';
import { AdminSettings } from './pages/admin/AdminSettings';

import { MasterDashboard } from './pages/master/MasterDashboard';
import { MasterClinics } from './pages/master/MasterClinics';
import { MasterAdministrators } from './pages/master/MasterAdministrators';
import { MasterSpecialties } from './pages/master/MasterSpecialties';
import { MasterProfessionals } from './pages/master/MasterProfessionals';
import { MasterHistory } from './pages/master/MasterHistory';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },

  // =========================================================
  // AUTENTICAÇÃO
  // =========================================================

  {
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'role-selection',
        element: <RoleSelection />,
      },
      {
        path: 'professional/select-clinic',
        element: <ProfessionalClinicSelection />,
      },
      {
        path: 'agendamento',
        element: <PublicSchedule />,
      },
      {
        path: 'unidade/:clinicId',
        element: <ClinicHome />,
      },
    ],
  },

  // =========================================================
  // PACIENTE
  // =========================================================

  {
    path: '/patient',
    element: <MainLayout role="patient" />,
    children: [
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <PatientDashboard />,
      },
      {
        path: 'schedule',
        element: <PatientSchedule />,
      },
      {
        path: 'appointments',
        element: <PatientAppointments />,
      },
      {
        path: 'history',
        element: <PatientHistory />,
      },
      {
        path: 'notifications',
        element: <NotificationsCenter />,
      },
      {
        path: 'profile',
        element: <PatientProfile />,
      },
    ],
  },

  // =========================================================
  // PROFISSIONAL
  // =========================================================

  {
    path: '/professional',
    element: <MainLayout role="professional" />,
    children: [
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <ProfessionalDashboard />,
      },
      {
        path: 'agenda',
        element: <ProfessionalAgenda />,
      },
      {
        path: 'patients-today',
        element: <ProfessionalPatientsToday />,
      },
      {
        path: 'consultation',
        element: <ProfessionalConsultation />,
      },
      {
        path: 'history',
        element: <ProfessionalHistory />,
      },
      {
        path: 'notifications',
        element: <NotificationsCenter />,
      },
      {
        path: 'settings',
        element: <ProfessionalSettings />,
      },
    ],
  },

  // =========================================================
  // ADMINISTRADOR DA CLÍNICA
  // =========================================================

  {
    path: '/admin',
    element: <MainLayout role="admin" />,
    children: [
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <AdminDashboard />,
      },
      {
        path: 'users',
        element: <AdminUsers />,
      },
      {
        path: 'professionals',
        element: <AdminProfessionals />,
      },
      {
        path: 'specialties',
        element: <AdminSpecialties />,
      },
      {
        path: 'reports',
        element: <AdminReports />,
      },
      {
        path: 'logs',
        element: <AdminLogs />,
      },
      {
        path: 'notifications',
        element: <NotificationsCenter />,
      },
      {
        path: 'settings',
        element: <AdminSettings />,
      },
    ],
  },

  // =========================================================
  // ADMIN MASTER
  // =========================================================

  {
    path: '/master',
    element: <MainLayout role="master" />,
    children: [
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <MasterDashboard />,
      },
      {
        path: 'clinics',
        element: <MasterClinics />,
      },
      {
        path: 'professionals',
        element: <MasterProfessionals />,
      },
      {
        path: 'specialties',
        element: <MasterSpecialties />,
      },
      {
        path: 'administrators',
        element: <MasterAdministrators />,
      },
      {
        path: 'notifications',
        element: <NotificationsCenter />,
      },
      {
        path: 'history',
        element: <MasterHistory />,
      },
    ],
  },
]);
