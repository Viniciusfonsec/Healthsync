import crypto from 'node:crypto';
import { conflict, forbidden, notFound } from '../../domain/errors/DomainError.js';
import type { Document, DocumentType } from '../../domain/entities/types.js';
import type { Repositories } from '../../domain/repositories/contracts.js';
import { DocumentCipher } from '../../infrastructure/crypto/DocumentCipher.js';
import { LocalFileStorage } from '../../infrastructure/storage/LocalFileStorage.js';

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export interface UploadDocumentInput {
  professionalId: number;
  clinicId: number;
  uploaderUserId: number;
  appointmentId: number;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  type: DocumentType;
}

export class DocumentService {
  constructor(
    private readonly repositories: Repositories,
    private readonly storage: LocalFileStorage,
    private readonly cipher: DocumentCipher,
  ) {}

  async listByAppointment(
    professionalId: number,
    clinicId: number,
    appointmentId: number,
  ): Promise<Document[]> {
    const appointment = await this.repositories.appointments.findById(appointmentId);
    if (!appointment) throw notFound('Consulta não encontrada');
    if (appointment.professionalId !== professionalId || appointment.clinicId !== clinicId) {
      throw forbidden('Acesso negado à consulta');
    }

    const attendance = await this.repositories.attendances.findByAppointmentId(appointmentId);
    if (!attendance) return [];

    return this.repositories.documents.findByAttendanceId(attendance.id);
  }

  async listByPatientAppointment(patientId: number, appointmentId: number): Promise<Document[]> {
    const appointment = await this.repositories.appointments.findById(appointmentId);
    if (!appointment || appointment.patientId !== patientId) throw notFound('Consulta não encontrada');
    const attendance = await this.repositories.attendances.findByAppointmentId(appointmentId);
    if (!attendance) return [];
    return this.repositories.documents.findByAttendanceId(attendance.id);
  }

  async downloadForPatient(documentId: number, patientId: number) {
    const document = await this.repositories.documents.findById(documentId);
    if (!document || document.patientId !== patientId) throw notFound('Documento não encontrado');
    const encrypted = await this.storage.read(document.storagePath);
    return { document, buffer: this.cipher.decrypt(encrypted, document.iv, document.authTag) };
  }

  async downloadForProfessional(documentId: number, professionalId: number, clinicId: number) {
    const document = await this.repositories.documents.findById(documentId);
    if (!document) throw notFound('Documento não encontrado');
    const attendance = await this.repositories.attendances.findById(document.attendanceId);
    const appointment = attendance
      ? await this.repositories.appointments.findById(attendance.appointmentId)
      : undefined;
    if (
      !attendance ||
      attendance.professionalId !== professionalId ||
      !appointment ||
      appointment.clinicId !== clinicId
    ) {
      throw notFound('Documento não encontrado');
    }
    const encrypted = await this.storage.read(document.storagePath);
    return { document, buffer: this.cipher.decrypt(encrypted, document.iv, document.authTag) };
  }

  async upload(input: UploadDocumentInput): Promise<Document> {
    const appointment = await this.repositories.appointments.findById(input.appointmentId);
    if (!appointment) throw notFound('Consulta não encontrada');
    if (appointment.professionalId !== input.professionalId || appointment.clinicId !== input.clinicId) {
      throw forbidden('A consulta não pertence ao profissional autenticado na unidade selecionada');
    }

    const patient = await this.repositories.patients.findById(appointment.patientId);
    if (!patient) throw notFound('Paciente não encontrado');

    const attendance = await this.repositories.attendances.findByAppointmentId(input.appointmentId);
    if (!attendance) {
      throw conflict('Inicie o atendimento antes de anexar documentos');
    }
    if (attendance.professionalId !== input.professionalId) {
      throw forbidden('O atendimento não pertence ao profissional autenticado');
    }

    if (!ALLOWED_MIME_TYPES.has(input.mimeType.toLowerCase())) {
      throw conflict('Tipo de arquivo não permitido. Envie PDF, JPG ou PNG.');
    }
    if (input.buffer.byteLength === 0) {
      throw conflict('O arquivo enviado está vazio');
    }
    if (input.buffer.byteLength > MAX_FILE_SIZE) {
      throw conflict('O arquivo excede o limite de 10 MB');
    }

    const storageKey = `document-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const encrypted = this.cipher.encrypt(input.buffer);
    const stored = await this.storage.write(storageKey, encrypted.encrypted);
    const now = new Date().toISOString();

    return this.repositories.documents.create({
      attendanceId: attendance.id,
      patientId: patient.id,
      uploadedBy: input.uploaderUserId,
      originalName: input.originalName.trim().slice(0, 255),
      mimeType: input.mimeType,
      size: input.buffer.byteLength,
      type: input.type,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      storagePath: stored.path,
      createdAt: now,
    });
  }
}
