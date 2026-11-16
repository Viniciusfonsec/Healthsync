import { notFound } from '../../domain/errors/DomainError.js';
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
} from '../../domain/entities/types.js';
import type {
  AdministratorRepository,
  AgendaBlockRepository,
  AppointmentRepository,
  AttendanceRepository,
  AvailabilityRepository,
  ClinicRepository,
  DocumentRepository,
  NotificationRepository,
  PatientRepository,
  PatientClinicRepository,
  ProfessionalRepository,
  ProfessionalClinicRepository,
  Repositories,
  SettingsRepository,
  SpecialtyRepository,
  UserRepository,
  AuditLogRepository,
} from '../../domain/repositories/contracts.js';
import { prisma } from '../database/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type {
  Clinic as ClinicRow,
  User as UserRow,
  Patient as PatientRow,
  PatientClinic as PatientClinicRow,
  Professional as ProfessionalRow,
  ProfessionalClinic as ProfessionalClinicRow,
  Administrator as AdministratorRow,
  Specialty as SpecialtyRow,
  Appointment as AppointmentRow,
  AvailabilitySlot as AvailabilitySlotRow,
  AgendaBlock as AgendaBlockRow,
  Attendance as AttendanceRow,
  Document as DocumentRow,
  Notification as NotificationRow,
  AuditLog as AuditLogRow,
} from '../../generated/prisma/client.js';

/** Cliente normal ou o cliente de uma transação: os repositórios funcionam com os dois. */
type Db = typeof prisma | Prisma.TransactionClient;

/** Usa a transação em andamento, se houver; senão abre uma nova. */
function withTransaction<T>(db: Db, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return db === prisma ? prisma.$transaction(work) : work(db);
}

/** Objeto do domínio gravado numa coluna JSON. */
function json(value: unknown): Prisma.InputJsonValue | undefined {
  return value == null ? undefined : (value as Prisma.InputJsonValue);
}

/** Converte o JSON do banco num objeto simples (ou undefined). */
function jsonObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function iso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

function address(value: unknown): any {
  return value ?? undefined;
}

function clinicFromRow(row: ClinicRow): Clinic {
  return {
    id: Number(row.id),
    name: row.name,
    document: row.document ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    address: address(row.address),
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function userFromRow(row: UserRow): User {
  return {
    id: Number(row.id),
    clinicId: Number(row.clinicId),
    role: row.role,
    email: row.email,
    passwordHash: row.passwordHash,
    active: row.active,
    isGuest: row.isGuest,
    failedLoginAttempts: row.failedLoginAttempts,
    lockedUntil: iso(row.lockedUntil) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function patientFromRow(row: PatientRow): Patient {
  return {
    id: Number(row.id),
    userId: Number(row.userId),
    name: row.name,
    email: row.email,
    phone: row.phone,
    cpf: row.cpf,
    birthDate: row.birthDate,
    gender: row.gender,
    bloodType: row.bloodType ?? undefined,
    plan: row.plan ?? undefined,
    priorities: Array.isArray(row.priorities) ? row.priorities : [],
    address: address(row.address),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function patientClinicFromRow(row: PatientClinicRow): PatientClinic {
  return {
    id: Number(row.id),
    patientId: Number(row.patientId),
    clinicId: Number(row.clinicId),
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function professionalFromRow(
  row: ProfessionalRow & { specialties?: { specialtyId: number }[] },
): Professional {
  return {
    id: Number(row.id),
    userId: Number(row.userId),
    clinicId: Number(row.clinicId),
    name: row.name,
    email: row.email,
    phone: row.phone,
    crm: row.crm,
    specialties: (row.specialties ?? []).map((item) => Number(item.specialtyId)),
    active: row.active,
    consultationDurationMinutes: row.consultationDurationMinutes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function professionalClinicFromRow(row: ProfessionalClinicRow): ProfessionalClinic {
  return {
    id: Number(row.id),
    professionalId: Number(row.professionalId),
    clinicId: Number(row.clinicId),
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function administratorFromRow(row: AdministratorRow): Administrator {
  return {
    id: Number(row.id),
    userId: Number(row.userId),
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function specialtyFromRow(row: SpecialtyRow): Specialty {
  return {
    id: Number(row.id),
    clinicId: Number(row.clinicId),
    name: row.name,
    description: row.description ?? undefined,
    icon: row.icon ?? undefined,
    avgMinutes: row.avgMinutes,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function appointmentFromRow(row: AppointmentRow): Appointment {
  return {
    id: Number(row.id),
    clinicId: Number(row.clinicId),
    patientId: Number(row.patientId),
    professionalId: Number(row.professionalId),
    specialtyId: Number(row.specialtyId),
    dateTime: row.dateTime.toISOString(),
    durationMinutes: row.durationMinutes,
    insuranceUsed: row.insuranceUsed ?? false,
    insuranceProvider: row.insuranceProvider ?? undefined,
    insuranceMemberNumber: row.insuranceMemberNumber ?? undefined,
    type: row.type,
    location: row.location,
    status: row.status,
    teleconsultationUrl: row.teleconsultationUrl ?? undefined,
    notes: row.notes ?? undefined,
    cancellationReason: row.cancellationReason ?? undefined,
    confirmedAt: iso(row.confirmedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function availabilityFromRow(row: AvailabilitySlotRow): AvailabilitySlot {
  return {
    id: Number(row.id),
    professionalId: Number(row.professionalId),
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    durationMinutes: row.durationMinutes,
    active: row.active,
  };
}

function blockFromRow(row: AgendaBlockRow): AgendaBlock {
  return {
    id: Number(row.id),
    professionalId: Number(row.professionalId),
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    reason: row.reason,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

function attendanceFromRow(row: AttendanceRow): Attendance {
  return {
    id: Number(row.id),
    appointmentId: Number(row.appointmentId),
    professionalId: Number(row.professionalId),
    status: row.status,
    notes: row.notes ?? undefined,
    diagnosis: row.diagnosis ?? undefined,
    prescription: row.prescription ?? undefined,
    startedAt: iso(row.startedAt),
    finishedAt: iso(row.finishedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function documentFromRow(row: DocumentRow): Document {
  return {
    id: Number(row.id),
    attendanceId: Number(row.attendanceId),
    patientId: Number(row.patientId),
    uploadedBy: Number(row.uploadedBy),
    originalName: row.originalName,
    mimeType: row.mimeType,
    size: row.size,
    type: row.type,
    iv: row.iv,
    authTag: row.authTag,
    storagePath: row.storagePath,
    createdAt: row.createdAt.toISOString(),
  };
}

function notificationFromRow(row: NotificationRow): Notification {
  return {
    id: Number(row.id),
    patientId: row.patientId == null ? undefined : Number(row.patientId),
    userId: row.userId == null ? undefined : Number(row.userId),
    appointmentId: row.appointmentId == null ? undefined : Number(row.appointmentId),
    type: row.type,
    channel: row.channel,
    content: row.content,
    status: row.status,
    readAt: iso(row.readAt),
    sentAt: iso(row.sentAt),
    attempts: row.attempts,
    createdAt: row.createdAt.toISOString(),
  };
}

function auditFromRow(row: AuditLogRow): AuditLog {
  return {
    id: Number(row.id),
    actorUserId: row.actorUserId == null ? undefined : Number(row.actorUserId),
    action: row.action,
    resource: row.resource,
    resourceId: row.resourceId == null ? undefined : Number(row.resourceId),
    metadata: jsonObject(row.metadata),
    createdAt: row.createdAt.toISOString(),
  };
}

const now = () => new Date();

class PrismaClinicRepository implements ClinicRepository {
  constructor(private readonly db: Db) {}
  async findById(id: number) {
    const row = await this.db.clinic.findUnique({ where: { id: id } });
    return row ? clinicFromRow(row) : undefined;
  }
  async list() {
    return (await this.db.clinic.findMany({ orderBy: { name: 'asc' } })).map(clinicFromRow);
  }
  async findByName(name: string) {
    const row = await this.db.clinic.findUnique({ where: { name: name.trim() } });
    return row ? clinicFromRow(row) : undefined;
  }
  async create(item: Omit<Clinic, 'id'>) {
    const row = await this.db.clinic.create({
      data: {
        name: item.name,
        document: item.document,
        phone: item.phone,
        email: item.email,
        address: json(item.address),
        active: item.active,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
    });
    return clinicFromRow(row);
  }
  async save(item: Clinic) {
    const row = await this.db.clinic.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        name: item.name,
        document: item.document,
        phone: item.phone,
        email: item.email,
        address: json(item.address),
        active: item.active,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
      update: {
        name: item.name,
        document: item.document,
        phone: item.phone,
        email: item.email,
        address: json(item.address),
        active: item.active,
      },
    });
    return clinicFromRow(row);
  }
  async update(id: number, patch: Partial<Clinic>) {
    const row = await this.db.clinic.update({
      where: { id },
      data: { ...patch, address: json(patch.address), updatedAt: now() } as Prisma.ClinicUncheckedUpdateInput,
    });
    return clinicFromRow(row);
  }
  async delete(id: number) {
    await this.db.clinic.delete({ where: { id } });
  }
}

class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: Db) {}
  async findById(id: number) {
    const row = await this.db.user.findUnique({ where: { id } });
    return row ? userFromRow(row) : undefined;
  }
  async list() {
    return (await this.db.user.findMany({ orderBy: { email: 'asc' } })).map(userFromRow);
  }
  async findByEmail(email: string) {
    const row = await this.db.user.findFirst({
      where: { email: email.toLowerCase().trim() },
      orderBy: { createdAt: 'asc' },
    });
    return row ? userFromRow(row) : undefined;
  }
  async findByEmailAndClinic(email: string, clinicId: number) {
    const row = await this.db.user.findUnique({
      where: { clinicId_email: { clinicId, email: email.toLowerCase().trim() } },
    });
    return row ? userFromRow(row) : undefined;
  }
  async create(item: Omit<User, 'id'>) {
    const row = await this.db.user.create({
      data: {
        clinicId: item.clinicId,
        role: item.role,
        email: item.email.toLowerCase().trim(),
        passwordHash: item.passwordHash,
        active: item.active,
        isGuest: item.isGuest ?? false,
        failedLoginAttempts: item.failedLoginAttempts ?? 0,
        lockedUntil: item.lockedUntil ? new Date(item.lockedUntil) : null,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
    });
    return userFromRow(row);
  }
  async save(item: User) {
    const row = await this.db.user.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        clinicId: item.clinicId,
        role: item.role,
        email: item.email.toLowerCase().trim(),
        passwordHash: item.passwordHash,
        active: item.active,
        isGuest: item.isGuest ?? false,
        failedLoginAttempts: item.failedLoginAttempts ?? 0,
        lockedUntil: item.lockedUntil ? new Date(item.lockedUntil) : null,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
      update: {
        clinicId: item.clinicId,
        role: item.role,
        email: item.email.toLowerCase().trim(),
        passwordHash: item.passwordHash,
        active: item.active,
        isGuest: item.isGuest ?? false,
        failedLoginAttempts: item.failedLoginAttempts ?? 0,
        lockedUntil: item.lockedUntil ? new Date(item.lockedUntil) : null,
      },
    });
    return userFromRow(row);
  }
  async update(id: number, patch: Partial<User>) {
    const row = await this.db.user.update({
      where: { id },
      data: {
        ...patch,
        lockedUntil:
          patch.lockedUntil === undefined
            ? undefined
            : patch.lockedUntil
              ? new Date(patch.lockedUntil)
              : null,
        updatedAt: now(),
        role: patch.role,
      } as Prisma.UserUncheckedUpdateInput,
    });
    return userFromRow(row);
  }
  async delete(id: number) {
    await this.db.user.delete({ where: { id } });
  }
}

class PrismaPatientRepository implements PatientRepository {
  constructor(private readonly db: Db) {}
  async findById(id: number) {
    const row = await this.db.patient.findUnique({ where: { id } });
    return row ? patientFromRow(row) : undefined;
  }
  async list() {
    return (await this.db.patient.findMany()).map(patientFromRow);
  }
  async findByUserId(userId: number) {
    const row = await this.db.patient.findUnique({ where: { userId } });
    return row ? patientFromRow(row) : undefined;
  }
  async findByCpf(cpf: string) {
    const row = await this.db.patient.findUnique({ where: { cpf } });
    return row ? patientFromRow(row) : undefined;
  }
  async create(item: Omit<Patient, 'id'>) {
    const row = await this.db.patient.create({
      data: {
        userId: item.userId,
        name: item.name,
        email: item.email,
        phone: item.phone,
        cpf: item.cpf,
        birthDate: item.birthDate,
        gender: item.gender,
        bloodType: item.bloodType,
        plan: item.plan,
        priorities: item.priorities ?? [],
        address: json(item.address),
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
    });
    return patientFromRow(row);
  }
  async save(item: Patient) {
    const row = await this.db.patient.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        userId: item.userId,
        name: item.name,
        email: item.email,
        phone: item.phone,
        cpf: item.cpf,
        birthDate: item.birthDate,
        gender: item.gender,
        bloodType: item.bloodType,
        plan: item.plan,
        priorities: item.priorities ?? [],
        address: json(item.address),
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
      update: {
        userId: item.userId,
        name: item.name,
        email: item.email,
        phone: item.phone,
        cpf: item.cpf,
        birthDate: item.birthDate,
        gender: item.gender,
        bloodType: item.bloodType,
        plan: item.plan,
        priorities: item.priorities ?? [],
        address: json(item.address),
      },
    });
    return patientFromRow(row);
  }
  async update(id: number, patch: Partial<Patient>) {
    const row = await this.db.patient.update({
      where: { id },
      data: {
        ...patch,
        address: json(patch.address),
        updatedAt: now(),
      } as Prisma.PatientUncheckedUpdateInput,
    });
    return patientFromRow(row);
  }
  async delete(id: number) {
    await this.db.patient.delete({ where: { id } });
  }
}

class PrismaPatientClinicRepository implements PatientClinicRepository {
  constructor(private readonly db: Db) {}
  async findById(id: number) {
    const row = await this.db.patientClinic.findUnique({ where: { id } });
    return row ? patientClinicFromRow(row) : undefined;
  }
  async list() {
    return (await this.db.patientClinic.findMany()).map(patientClinicFromRow);
  }
  async findByPatientId(patientId: number) {
    return (await this.db.patientClinic.findMany({ where: { patientId, active: true } })).map(
      patientClinicFromRow,
    );
  }
  async findByClinicId(clinicId: number) {
    return (await this.db.patientClinic.findMany({ where: { clinicId, active: true } })).map(
      patientClinicFromRow,
    );
  }
  async findByPatientAndClinic(patientId: number, clinicId: number) {
    const row = await this.db.patientClinic.findUnique({
      where: { patientId_clinicId: { patientId, clinicId } },
    });
    return row?.active ? patientClinicFromRow(row) : undefined;
  }
  async create(item: Omit<PatientClinic, 'id'>) {
    const row = await this.db.patientClinic.create({
      data: {
        patientId: item.patientId,
        clinicId: item.clinicId,
        active: item.active,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
    });
    return patientClinicFromRow(row);
  }
  async save(item: PatientClinic) {
    const row = await this.db.patientClinic.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        patientId: item.patientId,
        clinicId: item.clinicId,
        active: item.active,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
      update: { active: item.active, updatedAt: now() },
    });
    return patientClinicFromRow(row);
  }
  async update(id: number, patch: Partial<PatientClinic>) {
    const row = await this.db.patientClinic.update({ where: { id }, data: { ...patch, updatedAt: now() } });
    return patientClinicFromRow(row);
  }
  async delete(id: number) {
    await this.db.patientClinic.delete({ where: { id } });
  }
}

class PrismaProfessionalRepository implements ProfessionalRepository {
  constructor(private readonly db: Db) {}
  private include = { specialties: true };
  async findById(id: number) {
    const row = await this.db.professional.findUnique({ where: { id }, include: this.include });
    return row ? professionalFromRow(row) : undefined;
  }
  async list() {
    return (await this.db.professional.findMany({ include: this.include, orderBy: { name: 'asc' } })).map(
      professionalFromRow,
    );
  }
  async findByUserId(userId: number) {
    const row = await this.db.professional.findUnique({ where: { userId }, include: this.include });
    return row ? professionalFromRow(row) : undefined;
  }
  async findByCrm(crm: string) {
    const row = await this.db.professional.findUnique({ where: { crm }, include: this.include });
    return row ? professionalFromRow(row) : undefined;
  }
  async create(item: Omit<Professional, 'id'>) {
    const row = await withTransaction(this.db, async (tx) => {
      const saved = await tx.professional.create({
        data: {
          userId: item.userId,
          clinicId: item.clinicId,
          name: item.name,
          email: item.email,
          phone: item.phone,
          crm: item.crm,
          active: item.active,
          consultationDurationMinutes: item.consultationDurationMinutes,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
      });
      if (item.specialties.length)
        await tx.professionalSpecialty.createMany({
          data: item.specialties.map((specialtyId) => ({ professionalId: saved.id, specialtyId })),
        });
      return saved;
    });
    const full = await this.db.professional.findUnique({ where: { id: row.id }, include: this.include });
    if (!full) throw notFound('Profissional não encontrado');
    return professionalFromRow(full);
  }
  async save(item: Professional) {
    const row = await withTransaction(this.db, async (tx) => {
      const saved = await tx.professional.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          userId: item.userId,
          clinicId: item.clinicId,
          name: item.name,
          email: item.email,
          phone: item.phone,
          crm: item.crm,
          active: item.active,
          consultationDurationMinutes: item.consultationDurationMinutes,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
        update: {
          userId: item.userId,
          clinicId: item.clinicId,
          name: item.name,
          email: item.email,
          phone: item.phone,
          crm: item.crm,
          active: item.active,
          consultationDurationMinutes: item.consultationDurationMinutes,
        },
      });
      await tx.professionalSpecialty.deleteMany({ where: { professionalId: item.id } });
      if (item.specialties.length)
        await tx.professionalSpecialty.createMany({
          data: item.specialties.map((specialtyId) => ({ professionalId: item.id, specialtyId })),
        });
      return saved;
    });
    const full = await this.db.professional.findUnique({ where: { id: row.id }, include: this.include });
    if (!full) throw notFound('Profissional não encontrado');
    return professionalFromRow(full);
  }
  async update(id: number, patch: Partial<Professional>) {
    const row = await withTransaction(this.db, async (tx) => {
      await tx.professional.update({
        where: { id },
        data: {
          name: patch.name,
          email: patch.email,
          phone: patch.phone,
          crm: patch.crm,
          active: patch.active,
          clinicId: patch.clinicId,
          consultationDurationMinutes: patch.consultationDurationMinutes,
        },
      });
      if (patch.specialties) {
        await tx.professionalSpecialty.deleteMany({ where: { professionalId: id } });
        if (patch.specialties.length)
          await tx.professionalSpecialty.createMany({
            data: patch.specialties.map((specialtyId) => ({ professionalId: id, specialtyId })),
          });
      }
      return tx.professional.findUnique({ where: { id }, include: this.include });
    });
    if (!row) throw notFound('Profissional não encontrado');
    return professionalFromRow(row);
  }
  async delete(id: number) {
    await this.db.professional.delete({ where: { id } });
  }
}

class PrismaProfessionalClinicRepository implements ProfessionalClinicRepository {
  constructor(private readonly db: Db) {}
  async findById(id: number) {
    const row = await this.db.professionalClinic.findUnique({ where: { id } });
    return row ? professionalClinicFromRow(row) : undefined;
  }
  async list() {
    return (await this.db.professionalClinic.findMany()).map(professionalClinicFromRow);
  }
  async findByProfessionalId(professionalId: number) {
    return (await this.db.professionalClinic.findMany({ where: { professionalId, active: true } })).map(
      professionalClinicFromRow,
    );
  }
  async findByClinicId(clinicId: number) {
    return (await this.db.professionalClinic.findMany({ where: { clinicId, active: true } })).map(
      professionalClinicFromRow,
    );
  }
  async findByProfessionalAndClinic(professionalId: number, clinicId: number) {
    const row = await this.db.professionalClinic.findUnique({
      where: { professionalId_clinicId: { professionalId, clinicId } },
    });
    return row?.active ? professionalClinicFromRow(row) : undefined;
  }
  async create(item: Omit<ProfessionalClinic, 'id'>) {
    const row = await this.db.professionalClinic.create({
      data: {
        professionalId: item.professionalId,
        clinicId: item.clinicId,
        active: item.active,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
    });
    return professionalClinicFromRow(row);
  }
  async save(item: ProfessionalClinic) {
    const row = await this.db.professionalClinic.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        professionalId: item.professionalId,
        clinicId: item.clinicId,
        active: item.active,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
      update: { active: item.active, updatedAt: now() },
    });
    return professionalClinicFromRow(row);
  }
  async update(id: number, patch: Partial<ProfessionalClinic>) {
    const row = await this.db.professionalClinic.update({
      where: { id },
      data: { ...patch, updatedAt: now() },
    });
    return professionalClinicFromRow(row);
  }
  async delete(id: number) {
    await this.db.professionalClinic.delete({ where: { id } });
  }
}

class PrismaAdministratorRepository implements AdministratorRepository {
  constructor(private readonly db: Db) {}
  async findById(id: number) {
    const row = await this.db.administrator.findUnique({ where: { id } });
    return row ? administratorFromRow(row) : undefined;
  }
  async list() {
    return (await this.db.administrator.findMany({ orderBy: { name: 'asc' } })).map(administratorFromRow);
  }
  async findByUserId(userId: number) {
    const row = await this.db.administrator.findUnique({ where: { userId } });
    return row ? administratorFromRow(row) : undefined;
  }
  async create(item: Omit<Administrator, 'id'>) {
    const row = await this.db.administrator.create({
      data: {
        userId: item.userId,
        name: item.name,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
    });
    return administratorFromRow(row);
  }
  async save(item: Administrator) {
    const row = await this.db.administrator.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        userId: item.userId,
        name: item.name,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
      update: { name: item.name, updatedAt: now() },
    });
    return administratorFromRow(row);
  }
  async update(id: number, patch: Partial<Administrator>) {
    const row = await this.db.administrator.update({
      where: { id },
      data: { ...patch, updatedAt: now() } as Prisma.AdministratorUncheckedUpdateInput,
    });
    return administratorFromRow(row);
  }
  async delete(id: number) {
    await this.db.administrator.delete({ where: { id } });
  }
}

class PrismaSpecialtyRepository implements SpecialtyRepository {
  constructor(private readonly db: Db) {}
  async findById(id: number) {
    const row = await this.db.specialty.findUnique({ where: { id } });
    return row ? specialtyFromRow(row) : undefined;
  }
  async list() {
    return (await this.db.specialty.findMany({ orderBy: { name: 'asc' } })).map(specialtyFromRow);
  }
  async findByName(name: string) {
    const row = await this.db.specialty.findFirst({
      where: { name: name.trim() },
      orderBy: { createdAt: 'asc' },
    });
    return row ? specialtyFromRow(row) : undefined;
  }
  async create(item: Omit<Specialty, 'id'>) {
    const row = await this.db.specialty.create({
      data: {
        clinicId: item.clinicId,
        name: item.name,
        description: item.description,
        icon: item.icon,
        avgMinutes: item.avgMinutes,
        active: item.active,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
    });
    return specialtyFromRow(row);
  }
  async save(item: Specialty) {
    const row = await this.db.specialty.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        clinicId: item.clinicId,
        name: item.name,
        description: item.description,
        icon: item.icon,
        avgMinutes: item.avgMinutes,
        active: item.active,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
      update: {
        clinicId: item.clinicId,
        name: item.name,
        description: item.description,
        icon: item.icon,
        avgMinutes: item.avgMinutes,
        active: item.active,
      },
    });
    return specialtyFromRow(row);
  }
  async update(id: number, patch: Partial<Specialty>) {
    const row = await this.db.specialty.update({
      where: { id },
      data: { ...patch, updatedAt: now() } as Prisma.SpecialtyUncheckedUpdateInput,
    });
    return specialtyFromRow(row);
  }
  async delete(id: number) {
    await this.db.specialty.delete({ where: { id } });
  }
}

class PrismaAppointmentRepository implements AppointmentRepository {
  constructor(private readonly db: Db) {}
  async findById(id: number) {
    const row = await this.db.appointment.findUnique({ where: { id } });
    return row ? appointmentFromRow(row) : undefined;
  }
  async list() {
    return (await this.db.appointment.findMany({ orderBy: { dateTime: 'asc' } })).map(appointmentFromRow);
  }
  async findByDateTimeRange(from: Date, to: Date) {
    return (
      await this.db.appointment.findMany({
        where: { dateTime: { gte: from, lte: to } },
        orderBy: { dateTime: 'asc' },
      })
    ).map(appointmentFromRow);
  }
  async findByPatientId(patientId: number) {
    return (await this.db.appointment.findMany({ where: { patientId }, orderBy: { dateTime: 'asc' } })).map(
      appointmentFromRow,
    );
  }
  async findByProfessionalId(professionalId: number) {
    return (
      await this.db.appointment.findMany({ where: { professionalId }, orderBy: { dateTime: 'asc' } })
    ).map(appointmentFromRow);
  }
  async findByProfessionalAndRange(professionalId: number, from: Date, to: Date) {
    return (
      await this.db.appointment.findMany({
        where: { professionalId, dateTime: { gte: from, lte: to } },
        orderBy: { dateTime: 'asc' },
      })
    ).map(appointmentFromRow);
  }
  async findByProfessionalClinicAndRange(professionalId: number, clinicId: number, from: Date, to: Date) {
    return (
      await this.db.appointment.findMany({
        where: { professionalId, clinicId, dateTime: { gte: from, lte: to } },
        orderBy: { dateTime: 'asc' },
      })
    ).map(appointmentFromRow);
  }
  async create(item: Omit<Appointment, 'id'>) {
    const row = await this.db.appointment.create({
      data: {
        clinicId: item.clinicId,
        patientId: item.patientId,
        professionalId: item.professionalId,
        specialtyId: item.specialtyId,
        dateTime: new Date(item.dateTime),
        durationMinutes: item.durationMinutes,
        insuranceUsed: item.insuranceUsed ?? false,
        insuranceProvider: item.insuranceProvider,
        insuranceMemberNumber: item.insuranceMemberNumber,
        type: item.type,
        location: item.location,
        status: item.status,
        teleconsultationUrl: item.teleconsultationUrl,
        notes: item.notes,
        cancellationReason: item.cancellationReason,
        confirmedAt: item.confirmedAt ? new Date(item.confirmedAt) : null,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
    });
    return appointmentFromRow(row);
  }
  async save(item: Appointment) {
    const row = await this.db.appointment.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        clinicId: item.clinicId,
        patientId: item.patientId,
        professionalId: item.professionalId,
        specialtyId: item.specialtyId,
        dateTime: new Date(item.dateTime),
        durationMinutes: item.durationMinutes,
        insuranceUsed: item.insuranceUsed ?? false,
        insuranceProvider: item.insuranceProvider,
        insuranceMemberNumber: item.insuranceMemberNumber,
        type: item.type,
        location: item.location,
        status: item.status,
        teleconsultationUrl: item.teleconsultationUrl,
        notes: item.notes,
        cancellationReason: item.cancellationReason,
        confirmedAt: item.confirmedAt ? new Date(item.confirmedAt) : null,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
      update: {
        clinicId: item.clinicId,
        patientId: item.patientId,
        professionalId: item.professionalId,
        specialtyId: item.specialtyId,
        dateTime: new Date(item.dateTime),
        durationMinutes: item.durationMinutes,
        insuranceUsed: item.insuranceUsed ?? false,
        insuranceProvider: item.insuranceProvider,
        insuranceMemberNumber: item.insuranceMemberNumber,
        type: item.type,
        location: item.location,
        status: item.status,
        teleconsultationUrl: item.teleconsultationUrl,
        notes: item.notes,
        cancellationReason: item.cancellationReason,
        confirmedAt: item.confirmedAt ? new Date(item.confirmedAt) : null,
        updatedAt: now(),
      },
    });
    return appointmentFromRow(row);
  }
  async update(id: number, patch: Partial<Appointment>) {
    const row = await this.db.appointment.update({
      where: { id },
      data: {
        ...patch,
        dateTime: patch.dateTime ? new Date(patch.dateTime) : undefined,
        confirmedAt:
          patch.confirmedAt === undefined
            ? undefined
            : patch.confirmedAt
              ? new Date(patch.confirmedAt)
              : null,
        status: patch.status,
        updatedAt: now(),
      } as Prisma.AppointmentUncheckedUpdateInput,
    });
    return appointmentFromRow(row);
  }
  async delete(id: number) {
    await this.db.appointment.delete({ where: { id } });
  }
}

class PrismaAvailabilityRepository implements AvailabilityRepository {
  constructor(private readonly db: Db) {}
  async findById(id: number) {
    const row = await this.db.availabilitySlot.findUnique({ where: { id } });
    return row ? availabilityFromRow(row) : undefined;
  }
  async list() {
    return (await this.db.availabilitySlot.findMany()).map(availabilityFromRow);
  }
  async findByProfessionalId(professionalId: number) {
    return (
      await this.db.availabilitySlot.findMany({
        where: { professionalId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      })
    ).map(availabilityFromRow);
  }
  async deleteByProfessionalId(professionalId: number) {
    await this.db.availabilitySlot.deleteMany({ where: { professionalId } });
  }
  async create(item: Omit<AvailabilitySlot, 'id'>) {
    const row = await this.db.availabilitySlot.create({
      data: {
        professionalId: item.professionalId,
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
        durationMinutes: item.durationMinutes,
        active: item.active,
      },
    });
    return availabilityFromRow(row);
  }
  async save(item: AvailabilitySlot) {
    const row = await this.db.availabilitySlot.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        professionalId: item.professionalId,
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
        durationMinutes: item.durationMinutes,
        active: item.active,
      },
      update: {
        professionalId: item.professionalId,
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
        durationMinutes: item.durationMinutes,
        active: item.active,
      },
    });
    return availabilityFromRow(row);
  }
  async update(id: number, patch: Partial<AvailabilitySlot>) {
    const row = await this.db.availabilitySlot.update({
      where: { id },
      data: patch as Prisma.AvailabilitySlotUncheckedUpdateInput,
    });
    return availabilityFromRow(row);
  }
  async delete(id: number) {
    await this.db.availabilitySlot.delete({ where: { id } });
  }
}

class PrismaBlockRepository implements AgendaBlockRepository {
  constructor(private readonly db: Db) {}
  async findById(id: number) {
    const row = await this.db.agendaBlock.findUnique({ where: { id } });
    return row ? blockFromRow(row) : undefined;
  }
  async list() {
    return (await this.db.agendaBlock.findMany({ orderBy: { startsAt: 'asc' } })).map(blockFromRow);
  }
  async findByProfessionalAndRange(professionalId: number, from: Date, to: Date) {
    return (
      await this.db.agendaBlock.findMany({
        where: { professionalId, active: true, startsAt: { lte: to }, endsAt: { gte: from } },
      })
    ).map(blockFromRow);
  }
  async create(item: Omit<AgendaBlock, 'id'>) {
    const row = await this.db.agendaBlock.create({
      data: {
        professionalId: item.professionalId,
        startsAt: new Date(item.startsAt),
        endsAt: new Date(item.endsAt),
        reason: item.reason,
        active: item.active,
        createdAt: new Date(item.createdAt),
      },
    });
    return blockFromRow(row);
  }
  async save(item: AgendaBlock) {
    const row = await this.db.agendaBlock.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        professionalId: item.professionalId,
        startsAt: new Date(item.startsAt),
        endsAt: new Date(item.endsAt),
        reason: item.reason,
        active: item.active,
        createdAt: new Date(item.createdAt),
      },
      update: {
        professionalId: item.professionalId,
        startsAt: new Date(item.startsAt),
        endsAt: new Date(item.endsAt),
        reason: item.reason,
        active: item.active,
      },
    });
    return blockFromRow(row);
  }
  async update(id: number, patch: Partial<AgendaBlock>) {
    const row = await this.db.agendaBlock.update({
      where: { id },
      data: {
        ...patch,
        startsAt: patch.startsAt ? new Date(patch.startsAt) : undefined,
        endsAt: patch.endsAt ? new Date(patch.endsAt) : undefined,
      } as Prisma.AgendaBlockUncheckedUpdateInput,
    });
    return blockFromRow(row);
  }
  async delete(id: number) {
    await this.db.agendaBlock.delete({ where: { id } });
  }
}

class PrismaAttendanceRepository implements AttendanceRepository {
  constructor(private readonly db: Db) {}
  async findById(id: number) {
    const row = await this.db.attendance.findUnique({ where: { id } });
    return row ? attendanceFromRow(row) : undefined;
  }
  async list() {
    return (await this.db.attendance.findMany({ orderBy: { createdAt: 'desc' } })).map(attendanceFromRow);
  }
  async findByAppointmentId(appointmentId: number) {
    const row = await this.db.attendance.findUnique({ where: { appointmentId } });
    return row ? attendanceFromRow(row) : undefined;
  }
  async findByProfessionalAndRange(professionalId: number, from: Date, to: Date) {
    return (
      await this.db.attendance.findMany({ where: { professionalId, createdAt: { gte: from, lte: to } } })
    ).map(attendanceFromRow);
  }
  async findByPatientId(patientId: number) {
    return (await this.db.attendance.findMany({ where: { appointment: { patientId } } })).map(
      attendanceFromRow,
    );
  }
  async create(item: Omit<Attendance, 'id'>) {
    const row = await this.db.attendance.create({
      data: {
        appointmentId: item.appointmentId,
        professionalId: item.professionalId,
        status: item.status,
        notes: item.notes,
        diagnosis: item.diagnosis,
        prescription: item.prescription,
        startedAt: item.startedAt ? new Date(item.startedAt) : null,
        finishedAt: item.finishedAt ? new Date(item.finishedAt) : null,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
    });
    return attendanceFromRow(row);
  }
  async save(item: Attendance) {
    const row = await this.db.attendance.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        appointmentId: item.appointmentId,
        professionalId: item.professionalId,
        status: item.status,
        notes: item.notes,
        diagnosis: item.diagnosis,
        prescription: item.prescription,
        startedAt: item.startedAt ? new Date(item.startedAt) : null,
        finishedAt: item.finishedAt ? new Date(item.finishedAt) : null,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
      update: {
        appointmentId: item.appointmentId,
        professionalId: item.professionalId,
        status: item.status,
        notes: item.notes,
        diagnosis: item.diagnosis,
        prescription: item.prescription,
        startedAt: item.startedAt ? new Date(item.startedAt) : null,
        finishedAt: item.finishedAt ? new Date(item.finishedAt) : null,
        updatedAt: now(),
      },
    });
    return attendanceFromRow(row);
  }
  async update(id: number, patch: Partial<Attendance>) {
    const row = await this.db.attendance.update({
      where: { id },
      data: {
        ...patch,
        startedAt:
          patch.startedAt === undefined ? undefined : patch.startedAt ? new Date(patch.startedAt) : null,
        finishedAt:
          patch.finishedAt === undefined ? undefined : patch.finishedAt ? new Date(patch.finishedAt) : null,
        status: patch.status,
        updatedAt: now(),
      } as Prisma.AttendanceUncheckedUpdateInput,
    });
    return attendanceFromRow(row);
  }
  async delete(id: number) {
    await this.db.attendance.delete({ where: { id } });
  }
}

class PrismaDocumentRepository implements DocumentRepository {
  constructor(private readonly db: Db) {}
  async findById(id: number) {
    const row = await this.db.document.findUnique({ where: { id } });
    return row ? documentFromRow(row) : undefined;
  }
  async list() {
    return (await this.db.document.findMany()).map(documentFromRow);
  }
  async findByAttendanceId(attendanceId: number) {
    return (await this.db.document.findMany({ where: { attendanceId }, orderBy: { createdAt: 'desc' } })).map(
      documentFromRow,
    );
  }
  async create(item: Omit<Document, 'id'>) {
    const row = await this.db.document.create({
      data: {
        attendanceId: item.attendanceId,
        patientId: item.patientId,
        uploadedBy: item.uploadedBy,
        originalName: item.originalName,
        mimeType: item.mimeType,
        size: item.size,
        type: item.type,
        iv: item.iv,
        authTag: item.authTag,
        storagePath: item.storagePath,
        createdAt: new Date(item.createdAt),
      },
    });
    return documentFromRow(row);
  }
  async save(item: Document) {
    const row = await this.db.document.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        attendanceId: item.attendanceId,
        patientId: item.patientId,
        uploadedBy: item.uploadedBy,
        originalName: item.originalName,
        mimeType: item.mimeType,
        size: item.size,
        type: item.type,
        iv: item.iv,
        authTag: item.authTag,
        storagePath: item.storagePath,
        createdAt: new Date(item.createdAt),
      },
      update: {
        attendanceId: item.attendanceId,
        patientId: item.patientId,
        uploadedBy: item.uploadedBy,
        originalName: item.originalName,
        mimeType: item.mimeType,
        size: item.size,
        type: item.type,
        iv: item.iv,
        authTag: item.authTag,
        storagePath: item.storagePath,
      },
    });
    return documentFromRow(row);
  }
  async update(id: number, patch: Partial<Document>) {
    const row = await this.db.document.update({
      where: { id },
      data: patch as Prisma.DocumentUncheckedUpdateInput,
    });
    return documentFromRow(row);
  }
  async delete(id: number) {
    await this.db.document.delete({ where: { id } });
  }
}

class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly db: Db) {}
  async findById(id: number) {
    const row = await this.db.notification.findUnique({ where: { id } });
    return row ? notificationFromRow(row) : undefined;
  }
  async list() {
    return (await this.db.notification.findMany({ orderBy: { createdAt: 'desc' } })).map(notificationFromRow);
  }
  async findByPatientId(patientId: number) {
    return (
      await this.db.notification.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } })
    ).map(notificationFromRow);
  }
  async findByUserId(userId: number) {
    return (await this.db.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })).map(
      notificationFromRow,
    );
  }
  async findPending(limit: number) {
    return (
      await this.db.notification.findMany({
        where: { status: 'PENDENTE', channel: { in: ['WHATSAPP', 'EMAIL'] } },
        orderBy: { createdAt: 'asc' },
        take: limit,
      })
    ).map(notificationFromRow);
  }
  async create(item: Omit<Notification, 'id'>) {
    const row = await this.db.notification.create({
      data: {
        patientId: item.patientId ?? null,
        userId: item.userId ?? null,
        appointmentId: item.appointmentId ?? null,
        type: item.type,
        channel: item.channel,
        content: item.content,
        status: item.status,
        readAt: item.readAt ? new Date(item.readAt) : null,
        sentAt: item.sentAt ? new Date(item.sentAt) : null,
        attempts: item.attempts,
        createdAt: new Date(item.createdAt),
      },
    });
    return notificationFromRow(row);
  }
  async save(item: Notification) {
    const row = await this.db.notification.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        patientId: item.patientId ?? null,
        userId: item.userId ?? null,
        appointmentId: item.appointmentId ?? null,
        type: item.type,
        channel: item.channel,
        content: item.content,
        status: item.status,
        readAt: item.readAt ? new Date(item.readAt) : null,
        sentAt: item.sentAt ? new Date(item.sentAt) : null,
        attempts: item.attempts,
        createdAt: new Date(item.createdAt),
      },
      update: {
        patientId: item.patientId ?? null,
        userId: item.userId ?? null,
        appointmentId: item.appointmentId ?? null,
        type: item.type,
        channel: item.channel,
        content: item.content,
        status: item.status,
        readAt: item.readAt ? new Date(item.readAt) : null,
        sentAt: item.sentAt ? new Date(item.sentAt) : null,
        attempts: item.attempts,
      },
    });
    return notificationFromRow(row);
  }
  async update(id: number, patch: Partial<Notification>) {
    const row = await this.db.notification.update({
      where: { id },
      data: {
        ...patch,
        readAt: patch.readAt === undefined ? undefined : patch.readAt ? new Date(patch.readAt) : null,
        sentAt: patch.sentAt === undefined ? undefined : patch.sentAt ? new Date(patch.sentAt) : null,
        status: patch.status,
      } as Prisma.NotificationUncheckedUpdateInput,
    });
    return notificationFromRow(row);
  }
  async delete(id: number) {
    await this.db.notification.delete({ where: { id } });
  }
}

class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly db: Db) {}
  async findById(id: number) {
    const row = await this.db.auditLog.findUnique({ where: { id } });
    return row ? auditFromRow(row) : undefined;
  }
  async list() {
    return (await this.db.auditLog.findMany({ orderBy: { createdAt: 'desc' } })).map(auditFromRow);
  }
  async findByActor(userId: number) {
    return (
      await this.db.auditLog.findMany({ where: { actorUserId: userId }, orderBy: { createdAt: 'desc' } })
    ).map(auditFromRow);
  }
  async create(item: Omit<AuditLog, 'id'>) {
    const row = await this.db.auditLog.create({
      data: {
        actorUserId: item.actorUserId ?? null,
        action: item.action,
        resource: item.resource,
        resourceId: item.resourceId ?? null,
        metadata: json(item.metadata),
        createdAt: new Date(item.createdAt),
      },
    });
    return auditFromRow(row);
  }
  async save(item: AuditLog) {
    const row = await this.db.auditLog.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        actorUserId: item.actorUserId ?? null,
        action: item.action,
        resource: item.resource,
        resourceId: item.resourceId ?? null,
        metadata: json(item.metadata),
        createdAt: new Date(item.createdAt),
      },
      update: {
        actorUserId: item.actorUserId ?? null,
        action: item.action,
        resource: item.resource,
        resourceId: item.resourceId ?? null,
        metadata: json(item.metadata),
      },
    });
    return auditFromRow(row);
  }
  async update(id: number, patch: Partial<AuditLog>) {
    const row = await this.db.auditLog.update({
      where: { id },
      data: patch as Prisma.AuditLogUncheckedUpdateInput,
    });
    return auditFromRow(row);
  }
  async delete(id: number) {
    await this.db.auditLog.delete({ where: { id } });
  }
  async deleteOlderThan(date: Date) {
    return (await this.db.auditLog.deleteMany({ where: { createdAt: { lt: date } } })).count;
  }
}

class PrismaSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Db) {}
  async get(): Promise<SystemSettings> {
    const row = await this.db.systemSettings.findUnique({ where: { id: 1 } });
    if (!row) throw notFound('Configurações do sistema não encontradas');
    return {
      id: row.id,
      systemName: row.systemName,
      timezone: row.timezone,
      language: row.language,
      dateFormat: row.dateFormat,
      sessionTimeoutMinutes: row.sessionTimeoutMinutes,
      logRetentionDays: row.logRetentionDays,
      minPasswordLength: row.minPasswordLength,
      mfaRequired: row.mfaRequired,
      primaryColor: row.primaryColor,
      theme: row.theme as SystemSettings['theme'],
      compactMode: row.compactMode,
      smtp: row.smtp as SystemSettings['smtp'],
      updatedAt: row.updatedAt.toISOString(),
    };
  }
  async save(settings: SystemSettings): Promise<SystemSettings> {
    const row = await this.db.systemSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        systemName: settings.systemName,
        timezone: settings.timezone,
        language: settings.language,
        dateFormat: settings.dateFormat,
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
        logRetentionDays: settings.logRetentionDays,
        minPasswordLength: settings.minPasswordLength,
        mfaRequired: settings.mfaRequired,
        primaryColor: settings.primaryColor,
        theme: settings.theme,
        compactMode: settings.compactMode,
        smtp: settings.smtp as Prisma.InputJsonValue,
      },
      update: {
        systemName: settings.systemName,
        timezone: settings.timezone,
        language: settings.language,
        dateFormat: settings.dateFormat,
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
        logRetentionDays: settings.logRetentionDays,
        minPasswordLength: settings.minPasswordLength,
        mfaRequired: settings.mfaRequired,
        primaryColor: settings.primaryColor,
        theme: settings.theme,
        compactMode: settings.compactMode,
        smtp: settings.smtp as Prisma.InputJsonValue,
      },
    });
    return {
      id: row.id,
      systemName: row.systemName,
      timezone: row.timezone,
      language: row.language,
      dateFormat: row.dateFormat,
      sessionTimeoutMinutes: row.sessionTimeoutMinutes,
      logRetentionDays: row.logRetentionDays,
      minPasswordLength: row.minPasswordLength,
      mfaRequired: row.mfaRequired,
      primaryColor: row.primaryColor,
      theme: row.theme as SystemSettings['theme'],
      compactMode: row.compactMode,
      smtp: row.smtp as SystemSettings['smtp'],
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

export function createPrismaRepositories(db: Db = prisma): Repositories {
  return {
    clinics: new PrismaClinicRepository(db),
    users: new PrismaUserRepository(db),
    patients: new PrismaPatientRepository(db),
    patientClinics: new PrismaPatientClinicRepository(db),
    professionals: new PrismaProfessionalRepository(db),
    professionalClinics: new PrismaProfessionalClinicRepository(db),
    administrators: new PrismaAdministratorRepository(db),
    specialties: new PrismaSpecialtyRepository(db),
    appointments: new PrismaAppointmentRepository(db),
    availabilities: new PrismaAvailabilityRepository(db),
    blocks: new PrismaBlockRepository(db),
    attendances: new PrismaAttendanceRepository(db),
    documents: new PrismaDocumentRepository(db),
    notifications: new PrismaNotificationRepository(db),
    auditLogs: new PrismaAuditLogRepository(db),
    settings: new PrismaSettingsRepository(db),
    // Tudo o que `work` gravar é confirmado junto, ou desfeito se der erro.
    // Dentro de uma transação, uma nova chamada reaproveita a mesma transação.
    transaction: <T>(work: (repos: Repositories) => Promise<T>) =>
      db === prisma
        ? prisma.$transaction((tx) => work(createPrismaRepositories(tx)), { timeout: 15_000 })
        : work(createPrismaRepositories(db)),
  };
}
