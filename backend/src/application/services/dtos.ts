import type { Address, AppointmentType, PatientPriority } from '../../domain/entities/types.js';

/**
 * Dados de entrada dos serviços. Espelham o que os schemas zod da camada HTTP
 * entregam depois da validação, sem que a aplicação dependa da camada HTTP.
 */

export interface AppointmentCreateInput {
  patientId: number;
  clinicId: number;
  professionalId: number;
  specialtyId: number;
  dateTime: string;
  durationMinutes: number;
  type: AppointmentType;
  location: string;
  insuranceUsed?: boolean;
  insuranceProvider?: string;
  insuranceMemberNumber?: string;
}

export interface PublicAppointmentCreateInput extends Omit<AppointmentCreateInput, 'patientId'> {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  gender: string;
  lgpdConsentAccepted: true;
  notes?: string;
  priorities?: PatientPriority[];
}

export interface PatientProfilePatch {
  name?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  bloodType?: string;
  plan?: string;
  priorities?: PatientPriority[];
  address?: Address;
}

export interface PatientCreateInput {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  gender: string;
  password: string;
  bloodType?: string;
  plan?: string;
  priorities?: PatientPriority[];
}

export interface SpecialtyCreateInput {
  name: string;
  description?: string;
  icon?: string;
  avgMinutes: number;
}

export interface AvailabilitySlotInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface AttendanceCreateInput {
  notes?: string;
  diagnosis?: string;
  prescription?: string;
}
