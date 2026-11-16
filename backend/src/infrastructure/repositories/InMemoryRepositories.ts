import { InMemoryRepository } from './InMemoryRepository.js';

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

// =========================================================
// CLÍNICAS
// =========================================================

export class MemoryClinicRepository extends InMemoryRepository<Clinic> implements ClinicRepository {
  async findByName(name: string) {
    return [...this.items.values()].find((x) => x.name.toLowerCase() === name.toLowerCase());
  }
}

// =========================================================
// USUÁRIOS
// =========================================================

export class MemoryUserRepository extends InMemoryRepository<User> implements UserRepository {
  async findByEmail(email: string) {
    return [...this.items.values()].find((x) => x.email.toLowerCase() === email.toLowerCase());
  }

  async findByEmailAndClinic(email: string, clinicId: number) {
    return [...this.items.values()].find(
      (x) => x.clinicId === clinicId && x.email.toLowerCase() === email.toLowerCase(),
    );
  }
}

// =========================================================
// PACIENTES
// =========================================================

export class MemoryPatientRepository extends InMemoryRepository<Patient> implements PatientRepository {
  async findByUserId(userId: number) {
    return [...this.items.values()].find((x) => x.userId === userId);
  }

  async findByCpf(cpf: string) {
    return [...this.items.values()].find((x) => x.cpf === cpf);
  }
}

// =========================================================
// PACIENTE ↔ CLÍNICA
// =========================================================

export class MemoryPatientClinicRepository
  extends InMemoryRepository<PatientClinic>
  implements PatientClinicRepository
{
  async findByPatientId(patientId: number) {
    return [...this.items.values()].filter((x) => x.patientId === patientId && x.active);
  }

  async findByClinicId(clinicId: number) {
    return [...this.items.values()].filter((x) => x.clinicId === clinicId && x.active);
  }

  async findByPatientAndClinic(patientId: number, clinicId: number) {
    return [...this.items.values()].find(
      (x) => x.patientId === patientId && x.clinicId === clinicId && x.active,
    );
  }
}

// =========================================================
// PROFISSIONAIS
// =========================================================

export class MemoryProfessionalRepository
  extends InMemoryRepository<Professional>
  implements ProfessionalRepository
{
  async findByUserId(userId: number) {
    return [...this.items.values()].find((x) => x.userId === userId);
  }

  async findByCrm(crm: string) {
    return [...this.items.values()].find((x) => x.crm === crm);
  }
}

// =========================================================
// PROFISSIONAL ↔ CLÍNICA
// =========================================================

export class MemoryProfessionalClinicRepository
  extends InMemoryRepository<ProfessionalClinic>
  implements ProfessionalClinicRepository
{
  async findByProfessionalId(professionalId: number) {
    return [...this.items.values()].filter((item) => item.professionalId === professionalId && item.active);
  }

  async findByClinicId(clinicId: number) {
    return [...this.items.values()].filter((item) => item.clinicId === clinicId && item.active);
  }

  async findByProfessionalAndClinic(professionalId: number, clinicId: number) {
    return [...this.items.values()].find(
      (item) => item.professionalId === professionalId && item.clinicId === clinicId && item.active,
    );
  }
}

// =========================================================
// ADMINISTRADORES
// =========================================================

export class MemoryAdministratorRepository
  extends InMemoryRepository<Administrator>
  implements AdministratorRepository
{
  async findByUserId(userId: number) {
    return [...this.items.values()].find((x) => x.userId === userId);
  }
}

// =========================================================
// ESPECIALIDADES
// =========================================================

export class MemorySpecialtyRepository extends InMemoryRepository<Specialty> implements SpecialtyRepository {
  async findByName(name: string) {
    return [...this.items.values()].find((x) => x.name.toLowerCase() === name.toLowerCase());
  }
}

// =========================================================
// CONSULTAS
// =========================================================

export class MemoryAppointmentRepository
  extends InMemoryRepository<Appointment>
  implements AppointmentRepository
{
  async findByDateTimeRange(from: Date, to: Date) {
    return [...this.items.values()].filter((x) => {
      const d = new Date(x.dateTime);

      return d >= from && d <= to;
    });
  }

  async findByPatientId(patientId: number) {
    return [...this.items.values()]
      .filter((x) => x.patientId === patientId)
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }

  async findByProfessionalId(professionalId: number) {
    return [...this.items.values()]
      .filter((x) => x.professionalId === professionalId)
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }

  async findByProfessionalAndRange(professionalId: number, from: Date, to: Date) {
    return (await this.findByDateTimeRange(from, to)).filter((x) => x.professionalId === professionalId);
  }

  async findByProfessionalClinicAndRange(professionalId: number, clinicId: number, from: Date, to: Date) {
    return (await this.findByProfessionalAndRange(professionalId, from, to)).filter(
      (x) => x.clinicId === clinicId,
    );
  }
}

// =========================================================
// DISPONIBILIDADE
// =========================================================

export class MemoryAvailabilityRepository
  extends InMemoryRepository<AvailabilitySlot>
  implements AvailabilityRepository
{
  async findByProfessionalId(professionalId: number) {
    return [...this.items.values()].filter((x) => x.professionalId === professionalId);
  }

  async deleteByProfessionalId(professionalId: number) {
    for (const x of [...this.items.values()].filter((x) => x.professionalId === professionalId)) {
      this.items.delete(x.id);
    }
  }
}

// =========================================================
// BLOQUEIOS DE AGENDA
// =========================================================

export class MemoryBlockRepository extends InMemoryRepository<AgendaBlock> implements AgendaBlockRepository {
  async findByProfessionalAndRange(professionalId: number, from: Date, to: Date) {
    return [...this.items.values()].filter(
      (x) =>
        x.professionalId === professionalId &&
        new Date(x.endsAt) >= from &&
        new Date(x.startsAt) <= to &&
        x.active,
    );
  }
}

// =========================================================
// ATENDIMENTOS
// =========================================================

export class MemoryAttendanceRepository
  extends InMemoryRepository<Attendance>
  implements AttendanceRepository
{
  async findByAppointmentId(appointmentId: number) {
    return [...this.items.values()].find((x) => x.appointmentId === appointmentId);
  }

  async findByProfessionalAndRange(professionalId: number, from: Date, to: Date) {
    return [...this.items.values()].filter(
      (x) =>
        x.professionalId === professionalId && new Date(x.createdAt) >= from && new Date(x.createdAt) <= to,
    );
  }

  async findByPatientId(_patientId: number) {
    return [];
  }
}

// =========================================================
// DOCUMENTOS
// =========================================================

export class MemoryDocumentRepository extends InMemoryRepository<Document> implements DocumentRepository {
  async findByAttendanceId(attendanceId: number) {
    return [...this.items.values()].filter((x) => x.attendanceId === attendanceId);
  }
}

// =========================================================
// NOTIFICAÇÕES
// =========================================================

export class MemoryNotificationRepository
  extends InMemoryRepository<Notification>
  implements NotificationRepository
{
  async findByPatientId(patientId: number) {
    return [...this.items.values()]
      .filter((x) => x.patientId === patientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findByUserId(userId: number) {
    return [...this.items.values()]
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findPending(limit: number) {
    return [...this.items.values()]
      .filter((x) => x.status === 'PENDENTE' && x.channel !== 'IN_APP')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit);
  }
}

// =========================================================
// LOGS
// =========================================================

export class MemoryAuditLogRepository extends InMemoryRepository<AuditLog> implements AuditLogRepository {
  async deleteOlderThan(date: Date) {
    let removed = 0;
    for (const [id, item] of this.items) {
      if (new Date(item.createdAt) < date) {
        this.items.delete(id);
        removed += 1;
      }
    }
    return removed;
  }

  async findByActor(userId: number) {
    return [...this.items.values()]
      .filter((x) => x.actorUserId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

// =========================================================
// CONFIGURAÇÕES
// =========================================================

export class MemorySettingsRepository implements SettingsRepository {
  constructor(private settings: SystemSettings) {}

  async get() {
    return this.settings;
  }

  async save(settings: SystemSettings) {
    this.settings = settings;

    return settings;
  }
}

// =========================================================
// FACTORY
// =========================================================

export function createRepositories(initialSettings: SystemSettings): Repositories {
  const repos: Repositories = {
    clinics: new MemoryClinicRepository(),

    users: new MemoryUserRepository(),

    patients: new MemoryPatientRepository(),

    patientClinics: new MemoryPatientClinicRepository(),

    professionals: new MemoryProfessionalRepository(),

    professionalClinics: new MemoryProfessionalClinicRepository(),

    administrators: new MemoryAdministratorRepository(),

    specialties: new MemorySpecialtyRepository(),

    appointments: new MemoryAppointmentRepository(),

    availabilities: new MemoryAvailabilityRepository(),

    blocks: new MemoryBlockRepository(),

    attendances: new MemoryAttendanceRepository(),

    documents: new MemoryDocumentRepository(),

    notifications: new MemoryNotificationRepository(),

    auditLogs: new MemoryAuditLogRepository(),

    settings: new MemorySettingsRepository(initialSettings),

    // Mesmo comportamento do banco: se `work` falhar, tudo volta ao estado anterior.
    // (As transações em memória não são isoladas entre requisições simultâneas.)
    transaction: async (work) => {
      const restores = Object.values(repos)
        .filter(
          (repository): repository is InMemoryRepository<{ id: number }> =>
            repository instanceof InMemoryRepository,
        )
        .map((repository) => repository.snapshot());
      try {
        return await work(repos);
      } catch (error) {
        for (const restore of restores) restore();
        throw error;
      }
    },
  };
  return repos;
}
