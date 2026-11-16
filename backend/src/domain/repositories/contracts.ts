import type {
  Administrator,
  AgendaBlock,
  Appointment,
  Attendance,
  AvailabilitySlot,
  Clinic,
  Document,
  Notification,
  Patient,
  PatientClinic,
  Professional,
  ProfessionalClinic,
  Specialty,
  SystemSettings,
  User,
  AuditLog,
} from '../entities/types.js';

export interface CrudRepository<T extends { id: number }> {
  findById(id: number): Promise<T | undefined>;

  list(): Promise<T[]>;

  create(item: Omit<T, 'id'>): Promise<T>;

  save(item: T): Promise<T>;

  update(id: number, patch: Partial<T>): Promise<T>;

  delete(id: number): Promise<void>;
}

// =========================================================
// CLÍNICAS
// =========================================================

export interface ClinicRepository extends CrudRepository<Clinic> {
  findByName(name: string): Promise<Clinic | undefined>;
}

// =========================================================
// USUÁRIOS
// =========================================================

export interface UserRepository extends CrudRepository<User> {
  findByEmail(email: string): Promise<User | undefined>;

  findByEmailAndClinic(email: string, clinicId: number): Promise<User | undefined>;
}

// =========================================================
// PACIENTES
// =========================================================

export interface PatientRepository extends CrudRepository<Patient> {
  findByUserId(userId: number): Promise<Patient | undefined>;

  findByCpf(cpf: string): Promise<Patient | undefined>;
}

// =========================================================
// PACIENTE ↔ CLÍNICA
// =========================================================

export interface PatientClinicRepository extends CrudRepository<PatientClinic> {
  findByPatientId(patientId: number): Promise<PatientClinic[]>;

  findByClinicId(clinicId: number): Promise<PatientClinic[]>;

  findByPatientAndClinic(patientId: number, clinicId: number): Promise<PatientClinic | undefined>;
}

// =========================================================
// PROFISSIONAIS
// =========================================================

export interface ProfessionalRepository extends CrudRepository<Professional> {
  findByUserId(userId: number): Promise<Professional | undefined>;

  findByCrm(crm: string): Promise<Professional | undefined>;
}

// =========================================================
// PROFISSIONAL ↔ CLÍNICA
// =========================================================

export interface ProfessionalClinicRepository extends CrudRepository<ProfessionalClinic> {
  findByProfessionalId(professionalId: number): Promise<ProfessionalClinic[]>;

  findByClinicId(clinicId: number): Promise<ProfessionalClinic[]>;

  findByProfessionalAndClinic(
    professionalId: number,
    clinicId: number,
  ): Promise<ProfessionalClinic | undefined>;
}

// =========================================================
// ADMINISTRADORES
// =========================================================

export interface AdministratorRepository extends CrudRepository<Administrator> {
  findByUserId(userId: number): Promise<Administrator | undefined>;
}

// =========================================================
// ESPECIALIDADES
// =========================================================

export interface SpecialtyRepository extends CrudRepository<Specialty> {
  findByName(name: string): Promise<Specialty | undefined>;
}

// =========================================================
// CONSULTAS
// =========================================================

export interface AppointmentRepository extends CrudRepository<Appointment> {
  findByDateTimeRange(from: Date, to: Date): Promise<Appointment[]>;

  findByPatientId(patientId: number): Promise<Appointment[]>;

  findByProfessionalId(professionalId: number): Promise<Appointment[]>;

  findByProfessionalAndRange(professionalId: number, from: Date, to: Date): Promise<Appointment[]>;

  findByProfessionalClinicAndRange(
    professionalId: number,
    clinicId: number,
    from: Date,
    to: Date,
  ): Promise<Appointment[]>;
}

// =========================================================
// DISPONIBILIDADE
// =========================================================

export interface AvailabilityRepository extends CrudRepository<AvailabilitySlot> {
  findByProfessionalId(professionalId: number): Promise<AvailabilitySlot[]>;

  deleteByProfessionalId(professionalId: number): Promise<void>;
}

// =========================================================
// BLOQUEIOS DE AGENDA
// =========================================================

export interface AgendaBlockRepository extends CrudRepository<AgendaBlock> {
  findByProfessionalAndRange(professionalId: number, from: Date, to: Date): Promise<AgendaBlock[]>;
}

// =========================================================
// ATENDIMENTOS
// =========================================================

export interface AttendanceRepository extends CrudRepository<Attendance> {
  findByAppointmentId(appointmentId: number): Promise<Attendance | undefined>;

  findByProfessionalAndRange(professionalId: number, from: Date, to: Date): Promise<Attendance[]>;

  findByPatientId(patientId: number): Promise<Attendance[]>;
}

// =========================================================
// DOCUMENTOS
// =========================================================

export interface DocumentRepository extends CrudRepository<Document> {
  findByAttendanceId(attendanceId: number): Promise<Document[]>;
}

// =========================================================
// NOTIFICAÇÕES
// =========================================================

export interface NotificationRepository extends CrudRepository<Notification> {
  findByPatientId(patientId: number): Promise<Notification[]>;

  findByUserId(userId: number): Promise<Notification[]>;

  findPending(limit: number): Promise<Notification[]>;
}

// =========================================================
// LOGS
// =========================================================

export interface AuditLogRepository extends CrudRepository<AuditLog> {
  findByActor(userId: number): Promise<AuditLog[]>;

  /** Apaga os registros criados antes de `date` e devolve quantos foram apagados. */
  deleteOlderThan(date: Date): Promise<number>;
}

// =========================================================
// CONFIGURAÇÕES
// =========================================================

export interface SettingsRepository {
  get(): Promise<SystemSettings>;

  save(settings: SystemSettings): Promise<SystemSettings>;
}

// =========================================================
// CONJUNTO DE REPOSITÓRIOS
// =========================================================

export interface Repositories {
  clinics: ClinicRepository;

  users: UserRepository;

  patients: PatientRepository;

  patientClinics: PatientClinicRepository;

  professionals: ProfessionalRepository;

  professionalClinics: ProfessionalClinicRepository;

  administrators: AdministratorRepository;

  specialties: SpecialtyRepository;

  appointments: AppointmentRepository;

  availabilities: AvailabilityRepository;

  blocks: AgendaBlockRepository;

  attendances: AttendanceRepository;

  documents: DocumentRepository;

  notifications: NotificationRepository;

  auditLogs: AuditLogRepository;

  settings: SettingsRepository;

  /**
   * Executa várias gravações como uma unidade: ou todas são confirmadas,
   * ou nenhuma (se `work` lançar erro). Use o `repos` recebido dentro de `work`.
   */
  transaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T>;
}
