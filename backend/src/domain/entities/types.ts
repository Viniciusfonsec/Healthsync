export type Role = 'PACIENTE' | 'PROFISSIONAL' | 'ADMINISTRADOR' | 'ADMIN_MASTER';

export type AppointmentStatus = 'AGENDADA' | 'CONFIRMADA' | 'REALIZADA' | 'CANCELADA' | 'FALTA';

export type AppointmentType = 'PRESENCIAL' | 'TELEMEDICINA';

export type AttendanceStatus = 'ABERTO' | 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO';

export type PatientPriority = 'IDOSO' | 'GESTANTE' | 'PESSOA_COM_DEFICIENCIA';

export const PATIENT_PRIORITIES = [
  'IDOSO',
  'GESTANTE',
  'PESSOA_COM_DEFICIENCIA',
] as const satisfies readonly PatientPriority[];

export type NotificationType = 'CONSULTA' | 'LEMBRETE' | 'RESULTADO' | 'SISTEMA' | 'MENSAGEM';

export type CommunicationChannel = 'WHATSAPP' | 'EMAIL' | 'IN_APP';

export type NotificationStatus = 'PENDENTE' | 'ENVIADO' | 'ERRO' | 'CANCELADO';

export type DocumentType = 'EXAME' | 'DOCUMENTO' | 'PRESCRICAO' | 'OUTRO';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'CANCEL'
  | 'RESCHEDULE'
  | 'CONFIRM'
  | 'UPLOAD'
  | 'STATUS_CHANGE';

export interface Clinic {
  id: number;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: Address;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PatientClinic {
  id: number;
  patientId: number;
  clinicId: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  clinicId: number;
  role: Role;
  email: string;
  passwordHash: string;
  active: boolean;
  isGuest?: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfessionalClinic {
  id: number;
  professionalId: number;
  clinicId: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  gender: string;
  bloodType?: string;
  plan?: string;
  /** Preferência de atendimento (prioridade legal). */
  priorities?: PatientPriority[];
  address?: Address;
  createdAt: string;
  updatedAt: string;
}

export interface Professional {
  id: number;
  userId: number;
  clinicId: number;
  name: string;
  email: string;
  phone: string;
  crm: string;
  specialties: number[];
  active: boolean;
  consultationDurationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface Administrator {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Specialty {
  id: number;
  clinicId: number;
  name: string;
  description?: string;
  icon?: string;
  avgMinutes: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
}

export interface Appointment {
  id: number;
  clinicId: number;
  patientId: number;
  professionalId: number;
  specialtyId: number;
  dateTime: string;
  durationMinutes: number;
  insuranceUsed?: boolean;
  insuranceProvider?: string;
  insuranceMemberNumber?: string;
  type: AppointmentType;
  location: string;
  status: AppointmentStatus;
  teleconsultationUrl?: string;
  notes?: string;
  cancellationReason?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySlot {
  id: number;
  professionalId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  active: boolean;
}

export interface AgendaBlock {
  id: number;
  professionalId: number;
  startsAt: string;
  endsAt: string;
  reason: string;
  active: boolean;
  createdAt: string;
}

export interface Attendance {
  id: number;
  appointmentId: number;
  professionalId: number;
  status: AttendanceStatus;
  notes?: string;
  diagnosis?: string;
  prescription?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: number;
  attendanceId: number;
  patientId: number;
  uploadedBy: number;
  originalName: string;
  mimeType: string;
  size: number;
  type: DocumentType;
  iv: string;
  authTag: string;
  storagePath: string;
  createdAt: string;
}

export interface Notification {
  id: number;
  patientId?: number;
  userId?: number;
  appointmentId?: number;
  type: NotificationType;
  channel: CommunicationChannel;
  content: string;
  status: NotificationStatus;
  readAt?: string;
  sentAt?: string;
  attempts: number;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  actorUserId?: number;
  action: AuditAction;
  resource: string;
  resourceId?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SystemSettings {
  id: number;
  systemName: string;
  timezone: string;
  language: string;
  dateFormat: string;
  sessionTimeoutMinutes: number;
  logRetentionDays: number;
  minPasswordLength: number;
  mfaRequired: boolean;
  primaryColor: string;
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  smtp: {
    host: string;
    port: number;
    tls: boolean;
    user: string;
    password: string;
  };
  updatedAt: string;
}

export interface IdGenerator {
  next(): number;
}

export const nowIso = () => new Date().toISOString();
