import type { Repositories } from '../domain/repositories/contracts.js';
import { nowIso } from '../domain/entities/types.js';
import type { PasswordHasher } from './crypto/PasswordHasher.js';

/**
 * Carga dados de demonstração uma única vez em um banco vazio.
 * Os identificadores são gerados pelo PostgreSQL/Prisma.
 */
export async function seed(repos: Repositories, hasher: PasswordHasher, password: string) {
  if ((await repos.users.list()).length > 0) return;

  const t = nowIso();

  const createWeekdayAvailability = async (professionalId: number) => {
    for (const dayOfWeek of [1, 2, 3, 4, 5]) {
      await repos.availabilities.create({
        professionalId,
        dayOfWeek,
        startTime: '08:00',
        endTime: '17:00',
        durationMinutes: 30,
        active: true,
      });
    }
  };

  const masterClinic = await repos.clinics.create({
    name: 'HealthSync - Acesso Global',
    active: false,
    createdAt: t,
    updatedAt: t,
  });

  await repos.users.create({
    clinicId: masterClinic.id,
    role: 'ADMIN_MASTER',
    email: 'master@healthsync.local',
    passwordHash: await hasher.hash(password),
    active: true,
    isGuest: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: t,
    updatedAt: t,
  });

  const clinic1 = await repos.clinics.create({
    name: 'HealthSync Clínica Demo',
    phone: '(11) 4000-0000',
    email: 'contato@healthsync.local',
    active: true,
    createdAt: t,
    updatedAt: t,
  });

  const clinic2 = await repos.clinics.create({
    name: 'Clínica Saúde Integrada',
    phone: '(11) 4100-0000',
    email: 'contato@saudeintegrada.local',
    active: true,
    createdAt: t,
    updatedAt: t,
  });

  const clinic1PatientUser = await repos.users.create({
    clinicId: clinic1.id,
    role: 'PACIENTE',
    email: 'joaopedro@email.com',
    passwordHash: await hasher.hash(password),
    active: true,
    isGuest: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: t,
    updatedAt: t,
  });

  const clinic1CarlosUser = await repos.users.create({
    clinicId: clinic1.id,
    role: 'PROFISSIONAL',
    email: 'carlos.matos@healthsync.local',
    passwordHash: await hasher.hash(password),
    active: true,
    isGuest: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: t,
    updatedAt: t,
  });

  const clinic1FernandaUser = await repos.users.create({
    clinicId: clinic1.id,
    role: 'PROFISSIONAL',
    email: 'fernanda.lima@healthsync.local',
    passwordHash: await hasher.hash(password),
    active: true,
    isGuest: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: t,
    updatedAt: t,
  });

  const clinic1RafaelUser = await repos.users.create({
    clinicId: clinic1.id,
    role: 'PROFISSIONAL',
    email: 'rafael.costa@healthsync.local',
    passwordHash: await hasher.hash(password),
    active: true,
    isGuest: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: t,
    updatedAt: t,
  });

  const clinic1AdminUser = await repos.users.create({
    clinicId: clinic1.id,
    role: 'ADMINISTRADOR',
    email: 'admin@healthsync.local',
    passwordHash: await hasher.hash(password),
    active: true,
    isGuest: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: t,
    updatedAt: t,
  });

  const clinic1Cardiology = await repos.specialties.create({
    clinicId: clinic1.id,
    name: 'Cardiologia',
    description: 'Cuidados cardiovasculares',
    icon: '🫀',
    avgMinutes: 30,
    active: true,
    createdAt: t,
    updatedAt: t,
  });

  const clinic1Orthopedics = await repos.specialties.create({
    clinicId: clinic1.id,
    name: 'Ortopedia',
    description: 'Tratamento de ossos, articulações e músculos',
    icon: '🦴',
    avgMinutes: 30,
    active: true,
    createdAt: t,
    updatedAt: t,
  });

  const clinic1Neurology = await repos.specialties.create({
    clinicId: clinic1.id,
    name: 'Neurologia',
    description: 'Diagnóstico e tratamento de doenças neurológicas',
    icon: '🧠',
    avgMinutes: 30,
    active: true,
    createdAt: t,
    updatedAt: t,
  });

  const patient1 = await repos.patients.create({
    userId: clinic1PatientUser.id,
    name: 'João Pedro Azevedo',
    email: clinic1PatientUser.email,
    phone: '(21) 99876-5432',
    cpf: '12345678900',
    birthDate: '1988-05-19',
    gender: 'Masculino',
    bloodType: 'O+',
    plan: 'Premium',
    address: {
      cep: '20040-020',
      street: 'Rua da Quitanda',
      number: '42',
      complement: 'Apto 301',
      district: 'Centro',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
    createdAt: t,
    updatedAt: t,
  });

  await repos.patientClinics.create({
    patientId: patient1.id,
    clinicId: clinic1.id,
    active: true,
    createdAt: t,
    updatedAt: t,
  });

  const carlos = await repos.professionals.create({
    userId: clinic1CarlosUser.id,
    clinicId: clinic1.id,
    name: 'Dr. Carlos Matos',
    email: clinic1CarlosUser.email,
    phone: '(21) 99999-1000',
    crm: 'CRM-RJ-12345',
    specialties: [clinic1Cardiology.id],
    active: true,
    consultationDurationMinutes: 30,
    createdAt: t,
    updatedAt: t,
  });

  const fernanda = await repos.professionals.create({
    userId: clinic1FernandaUser.id,
    clinicId: clinic1.id,
    name: 'Dra. Fernanda Lima',
    email: clinic1FernandaUser.email,
    phone: '(11) 98888-3000',
    crm: 'CRM-SP-23456',
    specialties: [clinic1Orthopedics.id],
    active: true,
    consultationDurationMinutes: 30,
    createdAt: t,
    updatedAt: t,
  });

  const rafael = await repos.professionals.create({
    userId: clinic1RafaelUser.id,
    clinicId: clinic1.id,
    name: 'Dr. Rafael Costa',
    email: clinic1RafaelUser.email,
    phone: '(11) 97777-3000',
    crm: 'CRM-SP-34567',
    specialties: [clinic1Neurology.id],
    active: true,
    consultationDurationMinutes: 30,
    createdAt: t,
    updatedAt: t,
  });

  for (const professional of [carlos, fernanda, rafael]) {
    await repos.professionalClinics.create({
      professionalId: professional.id,
      clinicId: clinic1.id,
      active: true,
      createdAt: t,
      updatedAt: t,
    });
    await createWeekdayAvailability(professional.id);
  }

  await repos.administrators.create({
    userId: clinic1AdminUser.id,
    name: 'Administrador HealthSync',
    createdAt: t,
    updatedAt: t,
  });

  const clinic1Future = new Date(Date.now() + 36 * 60 * 60 * 1000);
  clinic1Future.setMinutes(0, 0, 0);
  await repos.appointments.create({
    clinicId: clinic1.id,
    patientId: patient1.id,
    professionalId: carlos.id,
    specialtyId: clinic1Cardiology.id,
    dateTime: clinic1Future.toISOString(),
    durationMinutes: 30,
    type: 'PRESENCIAL',
    location: 'Consultório 3 - Bloco A',
    status: 'CONFIRMADA',
    createdAt: t,
    updatedAt: t,
  });

  const clinic2PatientUser = await repos.users.create({
    clinicId: clinic2.id,
    role: 'PACIENTE',
    email: 'mariana.souza@saudeintegrada.local',
    passwordHash: await hasher.hash(password),
    active: true,
    isGuest: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: t,
    updatedAt: t,
  });

  const anaUser = await repos.users.create({
    clinicId: clinic2.id,
    role: 'PROFISSIONAL',
    email: 'ana.ribeiro@saudeintegrada.local',
    passwordHash: await hasher.hash(password),
    active: true,
    isGuest: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: t,
    updatedAt: t,
  });

  const camilaUser = await repos.users.create({
    clinicId: clinic2.id,
    role: 'PROFISSIONAL',
    email: 'camila.mendes@saudeintegrada.local',
    passwordHash: await hasher.hash(password),
    active: true,
    isGuest: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: t,
    updatedAt: t,
  });

  const clinic2AdminUser = await repos.users.create({
    clinicId: clinic2.id,
    role: 'ADMINISTRADOR',
    email: 'admin@saudeintegrada.local',
    passwordHash: await hasher.hash(password),
    active: true,
    isGuest: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: t,
    updatedAt: t,
  });

  const dermatology = await repos.specialties.create({
    clinicId: clinic2.id,
    name: 'Dermatologia',
    description: 'Cuidados com a pele, cabelos e unhas',
    icon: '🧴',
    avgMinutes: 30,
    active: true,
    createdAt: t,
    updatedAt: t,
  });

  const pediatrics = await repos.specialties.create({
    clinicId: clinic2.id,
    name: 'Pediatria',
    description: 'Atendimento médico infantil',
    icon: '👶',
    avgMinutes: 30,
    active: true,
    createdAt: t,
    updatedAt: t,
  });

  const gynecology = await repos.specialties.create({
    clinicId: clinic2.id,
    name: 'Ginecologia',
    description: 'Saúde feminina e acompanhamento ginecológico',
    icon: '🌸',
    avgMinutes: 30,
    active: true,
    createdAt: t,
    updatedAt: t,
  });

  const patient2 = await repos.patients.create({
    userId: clinic2PatientUser.id,
    name: 'Mariana Souza',
    email: clinic2PatientUser.email,
    phone: '(11) 98888-2000',
    cpf: '98765432100',
    birthDate: '1992-07-14',
    gender: 'Feminino',
    bloodType: 'A+',
    plan: 'Premium',
    priorities: ['GESTANTE'],
    address: {
      cep: '01310-100',
      street: 'Avenida Paulista',
      number: '1000',
      complement: 'Sala 402',
      district: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    },
    createdAt: t,
    updatedAt: t,
  });

  await repos.patientClinics.create({
    patientId: patient2.id,
    clinicId: clinic2.id,
    active: true,
    createdAt: t,
    updatedAt: t,
  });

  await repos.patientClinics.create({
    patientId: patient1.id,
    clinicId: clinic2.id,
    active: true,
    createdAt: t,
    updatedAt: t,
  });

  const ana = await repos.professionals.create({
    userId: anaUser.id,
    clinicId: clinic2.id,
    name: 'Dra. Ana Ribeiro',
    email: anaUser.email,
    phone: '(11) 97777-2000',
    crm: 'CRM-SP-67890',
    specialties: [dermatology.id, pediatrics.id],
    active: true,
    consultationDurationMinutes: 30,
    createdAt: t,
    updatedAt: t,
  });

  const camila = await repos.professionals.create({
    userId: camilaUser.id,
    clinicId: clinic2.id,
    name: 'Dra. Camila Mendes',
    email: camilaUser.email,
    phone: '(11) 96666-2000',
    crm: 'CRM-SP-78901',
    specialties: [gynecology.id],
    active: true,
    consultationDurationMinutes: 30,
    createdAt: t,
    updatedAt: t,
  });

  for (const professional of [ana, camila]) {
    await repos.professionalClinics.create({
      professionalId: professional.id,
      clinicId: clinic2.id,
      active: true,
      createdAt: t,
      updatedAt: t,
    });
    await createWeekdayAvailability(professional.id);
  }

  await repos.professionalClinics.create({
    professionalId: ana.id,
    clinicId: clinic1.id,
    active: true,
    createdAt: t,
    updatedAt: t,
  });

  await repos.administrators.create({
    userId: clinic2AdminUser.id,
    name: 'Administradora Saúde Integrada',
    createdAt: t,
    updatedAt: t,
  });

  const clinic2Future = new Date(Date.now() + 48 * 60 * 60 * 1000);
  clinic2Future.setMinutes(0, 0, 0);
  await repos.appointments.create({
    clinicId: clinic2.id,
    patientId: patient2.id,
    professionalId: ana.id,
    specialtyId: dermatology.id,
    dateTime: clinic2Future.toISOString(),
    durationMinutes: 30,
    type: 'PRESENCIAL',
    location: 'Consultório 2 - Clínica Saúde Integrada',
    status: 'CONFIRMADA',
    createdAt: t,
    updatedAt: t,
  });

  await repos.settings.save({
    id: 1,
    systemName: 'HealthSync',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    dateFormat: 'DD/MM/YYYY',
    sessionTimeoutMinutes: 360,
    logRetentionDays: 90,
    minPasswordLength: 8,
    mfaRequired: false,
    primaryColor: '#234B65',
    theme: 'light',
    compactMode: false,
    smtp: {
      host: '',
      port: 587,
      tls: true,
      user: '',
      password: '',
    },
    updatedAt: t,
  });
}
