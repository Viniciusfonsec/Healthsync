import { notifyError } from './notify';
import type { PatientPriority } from './priorities';
const viteEnv = (
  import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }
).env;

export const API_BASE_URL = viteEnv?.VITE_API_URL?.replace(/\/$/, '') || '';

export type Role = 'PACIENTE' | 'PROFISSIONAL' | 'ADMINISTRADOR' | 'ADMIN_MASTER';

export type AppointmentStatus = 'AGENDADA' | 'CONFIRMADA' | 'CANCELADA' | 'REALIZADA' | 'FALTA';

export type AttendanceStatus = 'ABERTO' | 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO';

export interface SessionUser {
  name?: string;
  email: string;
  role: Role;
  clinicId: string;
  availableClinics?: Array<Pick<Clinic, 'id' | 'name'>>;
}

/**
 * Sessão do navegador. O token fica num cookie httpOnly que o JavaScript não lê;
 * aqui guardamos só os dados de exibição do usuário.
 */
export interface Session {
  expiresIn?: string | number;
  user: SessionUser;
}

/** Cabeçalho exigido pelo backend nas requisições que alteram dados (proteção CSRF). */
const CSRF_HEADERS = { 'X-Requested-With': 'HealthSync' } as const;

/** Avisado quando a API responde 401 numa área logada: a sessão expirou. */
export const SESSION_EXPIRED_EVENT = 'healthsync:session-expired';

/** Diferencia, com segurança de tipos, a sessão final do desafio de escolha de unidade. */
export function isClinicSelectionChallenge(
  value: Session | ProfessionalLoginChallenge,
): value is ProfessionalLoginChallenge {
  return 'requiresClinicSelection' in value && value.requiresClinicSelection === true;
}

export interface ProfessionalLoginChallenge {
  requiresClinicSelection: true;
  selectionToken: string;
  clinics: Array<Pick<Clinic, 'id' | 'name'>>;
}

export interface Clinic {
  id: string;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface PatientProfile {
  id: string;
  userId: string;
  name?: string;
  email: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  bloodType?: string;
  plan?: string;
  priorities?: PatientPriority[];
  clinicId?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  [key: string]: unknown;
}

export interface Professional {
  id: string;
  userId: string;
  clinicId: string;
  clinicIds?: string[];
  name: string;
  email: string;
  phone: string;
  crm: string;
  specialties: string[];
  active: boolean;
  consultationDurationMinutes: number;
  availability?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    active?: boolean;
  }>;
  [key: string]: unknown;
}

export interface Specialty {
  id: string;
  clinicId: string;
  name: string;
  description?: string;
  icon?: string;
  avgMinutes: number;
  active: boolean;
  [key: string]: unknown;
}

export interface Appointment {
  id: string;
  clinicId?: string;
  patientId: string;
  professionalId: string;
  specialtyId: string;
  dateTime: string;
  durationMinutes: number;
  insuranceUsed?: boolean;
  insuranceProvider?: string;
  insuranceMemberNumber?: string;
  type: 'PRESENCIAL' | 'TELEMEDICINA';
  location: string;
  status: AppointmentStatus;
  attendance?: Attendance & {
    status: string;
    notes?: string;
    diagnosis?: string;
    prescription?: string;
    startedAt?: string;
    finishedAt?: string;
  };
  performedAt?: string;
  teleconsultationUrl?: string;
  patient?: {
    name: string;
    email: string;
    phone: string;
    cpf?: string;
    birthDate?: string;
    gender?: string;
    bloodType?: string;
    plan?: string;
    priorities?: PatientPriority[];
  };
  cancellationReason?: string;
  confirmedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  patientId?: string;
  userId?: string;
  appointmentId?: string;
  type: string;
  channel: string;
  content: string;
  status: string;
  attempts?: number;
  readAt?: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  appointmentId: string;
  professionalId: string;
  status: AttendanceStatus;
  notes?: string;
  diagnosis?: string;
  prescription?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  message?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(status: number, payload: ApiErrorPayload, fallback: string) {
    super(payload.error?.message ?? payload.message ?? fallback);

    this.name = 'ApiError';
    this.status = status;
    this.code = payload.error?.code;
    this.details = payload.error?.details;
  }
}

function normalizeApiIds(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeApiIds(item));
  if (!value || typeof value !== 'object') {
    if (
      typeof value === 'number' &&
      key &&
      (key === 'id' || key.endsWith('Id') || key === 'resourceId' || key === 'actorUserId')
    ) {
      return String(value);
    }
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (
      typeof entryValue === 'number' &&
      (entryKey === 'id' ||
        entryKey.endsWith('Id') ||
        entryKey === 'resourceId' ||
        entryKey === 'actorUserId')
    ) {
      output[entryKey] = String(entryValue);
    } else if ((entryKey === 'specialties' || entryKey === 'clinicIds') && Array.isArray(entryValue)) {
      output[entryKey] = entryValue.map((item) => (typeof item === 'number' ? String(item) : item));
    } else {
      output[entryKey] = normalizeApiIds(entryValue, entryKey);
    }
  }
  return output;
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return normalizeApiIds(await response.json());
  } catch {
    return null;
  }
}

function getPayloadError(body: unknown): ApiErrorPayload {
  return body && typeof body === 'object' ? (body as ApiErrorPayload) : {};
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  // O navegador precisa definir sozinho o Content-Type de FormData,
  // incluindo o boundary multipart. Forçar application/json aqui quebra
  // uploads de exames e documentos. Corpos JSON continuam recebendo o header.
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Requested-With', CSRF_HEADERS['X-Requested-With']);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      // Envia o cookie de sessão (httpOnly) junto com a requisição.
      credentials: 'include',
    });
  } catch {
    // Falha de rede / servidor fora do ar: antes não gerava nenhum aviso visível.
    const networkError = new ApiError(
      0,
      { message: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.' },
      'Falha de conexão',
    );
    notifyError(networkError.message);
    throw networkError;
  }

  const body = await parseBody(response);

  if (!response.ok) {
    const error = new ApiError(response.status, getPayloadError(body), `Erro HTTP ${response.status}`);
    // 401 fora do login = sessão expirada: o AuthProvider encerra a sessão local.
    // No login, o 401 é "credenciais inválidas" e aparece normalmente.
    const isAuthAttempt = path.includes('/auth/login') || path.includes('/auth/professional/select-clinic');
    if (response.status === 401 && !isAuthAttempt) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    } else if (response.status >= 400) {
      notifyError(error.message || 'Não foi possível concluir a operação.');
    }
    throw error;
  }

  return body as T;
}

export async function downloadApiFile(path: string, suggestedName: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', headers: CSRF_HEADERS });
  if (!response.ok) {
    const body = await parseBody(response);
    const error = new ApiError(response.status, getPayloadError(body), `Erro HTTP ${response.status}`);
    notifyError(error.message || 'Não foi possível baixar o arquivo.');
    throw error;
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = suggestedName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Encerra a sessão no servidor (apaga o cookie). */
export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: CSRF_HEADERS,
  });
}

export async function login(email: string, password: string): Promise<Session | ProfessionalLoginChallenge> {
  return apiRequest<Session | ProfessionalLoginChallenge>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function selectProfessionalClinic(selectionToken: string, clinicId: string): Promise<Session> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/professional/select-clinic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...CSRF_HEADERS },
    credentials: 'include',
    body: JSON.stringify({ selectionToken, clinicId }),
  });
  const body = await parseBody(response);
  if (!response.ok) {
    throw new ApiError(response.status, getPayloadError(body), `Erro HTTP ${response.status}`);
  }
  return body as Session;
}

export async function switchProfessionalClinic(clinicId: string): Promise<Session> {
  return apiRequest<Session>('/api/v1/auth/professional/switch-clinic', {
    method: 'POST',
    body: JSON.stringify({ clinicId }),
  });
}

export async function me() {
  return apiRequest<
    SessionUser & {
      active?: boolean;
      clinics?: Array<Pick<Clinic, 'id' | 'name'>>;
      clinicId?: string;
      profile?: PatientProfile | Professional | Record<string, unknown>;
    }
  >('/api/v1/auth/me');
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest<{ message: string }>('/api/v1/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });
}

export interface PublicProfessional {
  id: string;
  name: string;
  crm: string;
  specialties: string[];
  consultationDurationMinutes: number;
  active: boolean;
  availability?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    active?: boolean;
  }>;
}

export const publicApi = {
  clinics: () => apiRequest<{ data: Clinic[] }>('/api/v1/public/clinics'),
  specialties: (clinicId: string) =>
    apiRequest<{ data: Specialty[] }>(
      `/api/v1/public/catalog/specialties?clinicId=${encodeURIComponent(clinicId)}`,
    ),
  professionals: (clinicId: string) =>
    apiRequest<{ data: PublicProfessional[] }>(
      `/api/v1/public/catalog/professionals?clinicId=${encodeURIComponent(clinicId)}`,
    ),
  availability: (professionalId: string, date: string) =>
    apiRequest<{ data: { dateTime: string; durationMinutes: number }[] }>(
      `/api/v1/public/availability?professionalId=${encodeURIComponent(professionalId)}&date=${encodeURIComponent(date)}`,
    ),
  createAppointment: (payload: {
    clinicId: string;
    professionalId: string;
    specialtyId: string;
    dateTime: string;
    durationMinutes: number;
    type: Appointment['type'];
    location: string;
    name: string;
    email: string;
    phone: string;
    cpf: string;
    birthDate: string;
    gender: string;
    priorities?: PatientPriority[];
    lgpdConsentAccepted: boolean;
    insuranceUsed?: boolean;
    insuranceProvider?: string;
    insuranceMemberNumber?: string;
    notes?: string;
  }) =>
    apiRequest<{
      appointment: Pick<
        Appointment,
        | 'id'
        | 'dateTime'
        | 'durationMinutes'
        | 'type'
        | 'location'
        | 'status'
        | 'teleconsultationUrl'
        | 'clinicId'
      >;
      message: string;
    }>('/api/v1/public/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const notificationsApi = {
  list: () => apiRequest<{ data: Notification[] }>('/api/v1/notifications'),
  read: (id: string) =>
    apiRequest<Notification>(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  readAll: () => apiRequest<{ message: string }>('/api/v1/notifications/read-all', { method: 'POST' }),
};

export const patientApi = {
  appointments: () => apiRequest<{ data: Appointment[] }>('/api/v1/patient/appointments'),

  clinics: () => apiRequest<{ data: Clinic[] }>('/api/v1/patient/catalog/clinics'),

  specialties: (clinicId: string) =>
    apiRequest<{ data: Specialty[] }>(
      `/api/v1/patient/catalog/specialties?clinicId=${encodeURIComponent(clinicId)}`,
    ),

  professionals: (clinicId: string) =>
    apiRequest<{ data: Professional[] }>(
      `/api/v1/patient/catalog/professionals?clinicId=${encodeURIComponent(clinicId)}`,
    ),

  createAppointment: (payload: {
    clinicId: string;
    professionalId: string;
    specialtyId: string;
    dateTime: string;
    durationMinutes: number;
    type: Appointment['type'];
    location: string;
    insuranceUsed?: boolean;
    insuranceProvider?: string;
    insuranceMemberNumber?: string;
  }) =>
    apiRequest<Appointment>('/api/v1/patient/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sendCalendarEmail: (id: string) =>
    apiRequest<{ sent: boolean; email: string }>(
      `/api/v1/patient/appointments/${encodeURIComponent(id)}/calendar-email`,
      { method: 'POST' },
    ),

  reschedule: (id: string, dateTime: string) =>
    apiRequest<Appointment>(`/api/v1/patient/appointments/${id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ dateTime }),
    }),

  cancel: (id: string, reason: string) =>
    apiRequest<Appointment>(`/api/v1/patient/appointments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  confirm: (id: string) =>
    apiRequest<Appointment>(`/api/v1/patient/appointments/${id}/confirm`, {
      method: 'POST',
    }),

  history: () => apiRequest<{ data: Appointment[] }>('/api/v1/patient/history'),

  documents: (appointmentId: string) =>
    apiRequest<{
      data: Array<{
        id: string;
        fileName: string;
        type: string;
        mimeType: string;
        size: number;
        createdAt: string;
      }>;
    }>(`/api/v1/patient/appointments/${appointmentId}/documents`),
  downloadDocument: (documentId: string, fileName: string) =>
    downloadApiFile(`/api/v1/patient/documents/${documentId}/download`, fileName),

  notifications: () => apiRequest<{ data: Notification[] }>('/api/v1/patient/notifications'),

  readNotification: (id: string) =>
    apiRequest<Notification>(`/api/v1/patient/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  readAllNotifications: () =>
    apiRequest<{ message: string }>('/api/v1/patient/notifications/read-all', {
      method: 'POST',
    }),

  profile: () => apiRequest<PatientProfile>('/api/v1/patient/profile'),

  updateProfile: (payload: Partial<PatientProfile>) =>
    apiRequest<PatientProfile>('/api/v1/patient/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        ...payload,
        ...(payload.address
          ? {
              address: {
                cep: payload.address.zipCode ?? '',
                street: payload.address.street ?? '',
                number: payload.address.number ?? '',
                complement: payload.address.complement,
                district: payload.address.neighborhood ?? '',
                city: payload.address.city ?? '',
                state: payload.address.state ?? '',
              },
            }
          : {}),
      }),
    }),
};

export const professionalApi = {
  history: () => apiRequest<{ data: Appointment[] }>('/api/v1/professional/history'),
  appointment: (id: string) => apiRequest<Appointment>(`/api/v1/professional/appointments/${id}`),

  agenda: (from: Date, to: Date) => {
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });

    return apiRequest<{ data: Appointment[] }>(`/api/v1/professional/agenda?${params.toString()}`);
  },

  availability: () =>
    apiRequest<{
      data: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        durationMinutes: number;
        active: boolean;
      }>;
    }>('/api/v1/professional/agenda/availability'),

  saveAvailability: (
    slots: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      durationMinutes: number;
    }>,
  ) =>
    apiRequest<{ data: unknown[] }>('/api/v1/professional/agenda/availability', {
      method: 'PUT',
      body: JSON.stringify({ slots }),
    }),

  blockAgenda: (payload: { startsAt: string; endsAt: string; reason: string }) =>
    apiRequest('/api/v1/professional/agenda/blocks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  duration: (minutes: number) =>
    apiRequest<Professional>('/api/v1/professional/settings/duration', {
      method: 'PATCH',
      body: JSON.stringify({ minutes }),
    }),

  patientHistory: (cpf: string) =>
    apiRequest<{
      patient: PatientProfile;
      attendances: Attendance[];
    }>(`/api/v1/professional/patients/${encodeURIComponent(cpf)}/history`),

  /** Registra que o paciente não compareceu (consulta passa para FALTA). */
  markNoShow: (appointmentId: string) =>
    apiRequest<Appointment>(`/api/v1/professional/appointments/${appointmentId}/no-show`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    }),

  startAttendance: (appointmentId: string, payload: Record<string, unknown> = {}) =>
    apiRequest<Attendance>(`/api/v1/professional/appointments/${appointmentId}/attendance`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAttendanceStatus: (attendanceId: string, status: AttendanceStatus) =>
    apiRequest<Attendance>(`/api/v1/professional/attendances/${attendanceId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  documents: (appointmentId: string) =>
    apiRequest<{
      data: Array<{
        id: string;
        fileName: string;
        type: 'EXAME' | 'DOCUMENTO' | 'PRESCRICAO' | 'OUTRO';
        mimeType: string;
        size: number;
        createdAt: string;
      }>;
    }>(`/api/v1/professional/appointments/${appointmentId}/documents`),
  downloadDocument: (documentId: string, fileName: string) =>
    downloadApiFile(`/api/v1/professional/documents/${documentId}/download`, fileName),

  uploadDocument: (
    appointmentId: string,
    file: File,
    type: 'EXAME' | 'DOCUMENTO' | 'PRESCRICAO' | 'OUTRO',
  ) => {
    const body = new FormData();
    body.append('file', file);

    return apiRequest<{
      document: {
        id: string;
        fileName: string;
        type: 'EXAME' | 'DOCUMENTO' | 'PRESCRICAO' | 'OUTRO';
        mimeType: string;
        size: number;
        createdAt: string;
      };
      message: string;
    }>(`/api/v1/professional/appointments/${appointmentId}/documents?type=${encodeURIComponent(type)}`, {
      method: 'POST',
      body,
    });
  },
};

export const adminApi = {
  dashboard: () => apiRequest('/api/v1/admin/dashboard'),

  users: () => apiRequest<{ data: unknown[] }>('/api/v1/admin/users'),

  createPatient: (payload: Record<string, unknown>) =>
    apiRequest('/api/v1/admin/users/patients', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  specialties: () => apiRequest<{ data: Specialty[] }>('/api/v1/admin/specialties'),

  createSpecialty: (payload: { name: string; description?: string; icon?: string; avgMinutes: number }) =>
    apiRequest<Specialty>('/api/v1/admin/specialties', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  professionals: () => apiRequest<{ data: Professional[] }>('/api/v1/admin/professionals'),

  absences: (from: Date, to: Date) => {
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });

    return apiRequest<{ data: Appointment[] }>(`/api/v1/admin/reports/absences?${params.toString()}`);
  },

  productivity: (from: Date, to: Date) => {
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });

    return apiRequest<{ data: unknown[] }>(`/api/v1/admin/reports/productivity?${params.toString()}`);
  },

  auditLogs: () => apiRequest<{ data: unknown[] }>('/api/v1/admin/logs'),

  settings: () => apiRequest<Record<string, unknown>>('/api/v1/admin/settings'),

  updateSettings: (payload: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>('/api/v1/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

export type MasterClinicAddress = {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
};

export type MasterClinic = {
  id: string;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: MasterClinicAddress;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MasterClinicPayload = {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: MasterClinicAddress;
};

export const masterApi = {
  auditLogs: () => apiRequest<{ data: unknown[] }>('/api/v1/master/logs'),

  clinics: () => apiRequest<{ data: MasterClinic[] }>('/api/v1/master/clinics'),

  createClinic: (payload: MasterClinicPayload) =>
    apiRequest<MasterClinic>('/api/v1/master/clinics', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateClinic: (
    id: string,
    payload: Partial<MasterClinicPayload> & {
      active?: boolean;
    },
  ) =>
    apiRequest<MasterClinic>(`/api/v1/master/clinics/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

export type MasterProfessionalPayload = {
  clinicId: string;
  clinicIds?: string[];
  allClinics?: boolean;
  name: string;
  email: string;
  phone: string;
  crm: string;
  specialties: string[];
  consultationDurationMinutes: number;
  password?: string;
};

export const masterProfessionalsApi = {
  list: () => apiRequest<{ data: Professional[] }>('/api/v1/master/professionals'),

  create: (payload: MasterProfessionalPayload) =>
    apiRequest<Professional>('/api/v1/master/professionals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (
    id: string,
    payload: Partial<Omit<MasterProfessionalPayload, 'password'>> & {
      active?: boolean;
    },
  ) =>
    apiRequest<Professional>(`/api/v1/master/professionals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

export const masterSpecialtiesApi = {
  list: () => apiRequest<{ data: Specialty[] }>('/api/v1/master/specialties'),

  create: (payload: {
    clinicId: string;
    name: string;
    description?: string;
    icon?: string;
    avgMinutes: number;
  }) =>
    apiRequest<Specialty>('/api/v1/master/specialties', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (
    id: string,
    payload: {
      clinicId?: string;
      name?: string;
      description?: string;
      icon?: string;
      avgMinutes?: number;
      active?: boolean;
    },
  ) =>
    apiRequest<Specialty>(`/api/v1/master/specialties/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

export type MasterAdministrator = {
  id: string;
  userId: string;
  clinicId: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export const masterAdministratorsApi = {
  list: () => apiRequest<{ data: MasterAdministrator[] }>('/api/v1/master/administrators'),

  create: (payload: { clinicId: string; name: string; email: string; password: string }) =>
    apiRequest<MasterAdministrator>('/api/v1/master/administrators', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (
    id: string,
    payload: {
      clinicId?: string;
      name?: string;
      email?: string;
      active?: boolean;
    },
  ) =>
    apiRequest<MasterAdministrator>(`/api/v1/master/administrators/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
