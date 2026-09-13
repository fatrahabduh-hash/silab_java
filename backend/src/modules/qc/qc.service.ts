import { QcRepository } from './qc.repository.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/errors/app-error.js';
import { JwtUserPayload } from '../auth/auth.types.js';
import {
  CreateQcInput,
  CreateStandardSampleInput,
  ReviewQcInput,
  QcQueryFilter,
} from './qc.types.js';

export class QcService {
  /**
   * Pencatatan data pengujian QC analitis baru
   */
  static async createQc(input: CreateQcInput, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden(
        'Akses ditolak: Klien tidak memiliki izin mencatat data QC laboratorium',
        'FORBIDDEN_QC_CREATION'
      );
    }

    const sample = await prisma.sample.findUnique({
      where: { id: input.sampelId },
    });

    if (!sample) {
      throw AppError.notFound(
        `Sampel dengan ID ${input.sampelId} tidak ditemukan di sistem`,
        'SAMPLE_NOT_FOUND'
      );
    }

    if (input.preparasiId) {
      const prep = await prisma.samplePreparation.findUnique({
        where: { id: input.preparasiId },
      });
      if (!prep) {
        throw AppError.notFound(
          `Catatan preparasi dengan ID ${input.preparasiId} tidak ditemukan`,
          'PREPARATION_NOT_FOUND'
        );
      }
    }

    return QcRepository.createQc(input, user.sub);
  }

  /**
   * Pendaftaran nilai acuan CRM / Standar QC
   */
  static async createStandardSample(input: CreateStandardSampleInput, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden(
        'Akses ditolak: Klien tidak memiliki izin mendaftarkan standar CRM',
        'FORBIDDEN_QC_STANDARD_CREATION'
      );
    }

    return QcRepository.createStandardSample(input, user.sub);
  }

  /**
   * Review dan validasi mutu oleh Supervisor atau Admin
   */
  static async reviewQc(id: number, input: ReviewQcInput, user: JwtUserPayload) {
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      throw AppError.forbidden(
        'Akses ditolak: Hanya Supervisor atau Admin yang memiliki wewenang mereview dan memvalidasi mutu QC',
        'FORBIDDEN_QC_REVIEW'
      );
    }

    const existing = await QcRepository.findQcById(id);
    if (!existing) {
      throw AppError.notFound(
        `Catatan QC dengan ID ${id} tidak ditemukan`,
        'QC_NOT_FOUND'
      );
    }

    return QcRepository.reviewQc(id, input, user.sub);
  }

  /**
   * Mengambil daftar riwayat pengujian QC analitis
   */
  static async getQcRecords(query: QcQueryFilter, user: JwtUserPayload) {
    let clientFilter: string | undefined;

    if (user.role === 'client' || user.role === 'klien') {
      clientFilter = user.username;
    }

    return QcRepository.findQcRecords(query, clientFilter);
  }

  /**
   * Mengambil detail catatan QC berdasarkan ID
   */
  static async getQcById(id: number, user: JwtUserPayload) {
    const record = await QcRepository.findQcById(id);

    if (!record) {
      throw AppError.notFound(
        `Catatan QC dengan ID ${id} tidak ditemukan`,
        'QC_NOT_FOUND'
      );
    }

    // Isolasi multi-tenant Klien
    if (user.role === 'client' || user.role === 'klien') {
      if (record.sample.klien !== user.username) {
        throw AppError.forbidden(
          'Akses ditolak: Anda tidak memiliki izin melihat data QC sampel ini',
          'FORBIDDEN_CLIENT_QC_ACCESS'
        );
      }
    }

    return record;
  }

  /**
   * Mengambil statistik ringkasan mutu QC untuk dasbor lab
   */
  static async getQcStatistics(user: JwtUserPayload) {
    let clientFilter: string | undefined;

    if (user.role === 'client' || user.role === 'klien') {
      clientFilter = user.username;
    }

    return QcRepository.getQcStatistics(clientFilter);
  }

  /**
   * Menghapus catatan QC
   */
  static async deleteQc(id: number, user: JwtUserPayload) {
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      throw AppError.forbidden(
        'Akses ditolak: Hanya Admin atau Supervisor yang berwenang menghapus catatan QC',
        'FORBIDDEN_QC_DELETE'
      );
    }

    const existing = await QcRepository.findQcById(id);
    if (!existing) {
      throw AppError.notFound(
        `Catatan QC dengan ID ${id} tidak ditemukan`,
        'QC_NOT_FOUND'
      );
    }

    return QcRepository.deleteQc(id, user.sub);
  }
}
