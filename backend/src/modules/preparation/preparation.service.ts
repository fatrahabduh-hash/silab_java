import { PreparationRepository } from './preparation.repository.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/errors/app-error.js';
import { JwtUserPayload } from '../auth/auth.types.js';
import {
  CreatePreparationInput,
  UpdatePreparationInput,
  PreparationQueryFilter,
} from './preparation.types.js';

export class PreparationService {
  /**
   * Mengambil daftar reagen kimia siap pakai dari inventaris
   */
  static async getAvailableReagents() {
    return PreparationRepository.getAvailableReagents();
  }

  /**
   * Mencatat data preparasi sampel baru (single atau batch WO)
   */
  static async createPreparation(input: CreatePreparationInput, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden(
        'Akses ditolak: Klien tidak memiliki wewenang mencatat preparasi sampel',
        'FORBIDDEN_PREPARATION_CREATION'
      );
    }

    let targetSampleIds: number[] = [];

    if (input.modeInput === 'wo' && input.workOrderId) {
      const wo = await prisma.workOrder.findUnique({
        where: { id: input.workOrderId },
        include: { workOrderSamples: true },
      });

      if (!wo) {
        throw AppError.notFound(
          `Work Order dengan ID ${input.workOrderId} tidak ditemukan`,
          'WORK_ORDER_NOT_FOUND'
        );
      }

      if (input.sampelIds && input.sampelIds.length > 0) {
        targetSampleIds = input.sampelIds;
      } else if (input.sampelId) {
        targetSampleIds = [input.sampelId];
      } else {
        targetSampleIds = wo.workOrderSamples.map((wos: { sampelId: number }) => wos.sampelId);
      }

      if (targetSampleIds.length === 0) {
        throw AppError.badRequest(
          'Tidak ada sampel yang terdaftar dalam Work Order ini untuk dipreparasi',
          'NO_SAMPLES_IN_WORK_ORDER'
        );
      }
    } else {
      const sid = input.sampelId;
      if (!sid) {
        throw AppError.badRequest(
          'ID sampel wajib disertakan untuk mode single',
          'SAMPLE_ID_REQUIRED'
        );
      }
      targetSampleIds = [sid];
    }

    // Verifikasi keberadaan sampel
    const existingSamples = await prisma.sample.findMany({
      where: { id: { in: targetSampleIds } },
      select: { id: true, kodeSampel: true },
    });

    if (existingSamples.length !== targetSampleIds.length) {
      throw AppError.notFound(
        'Satu atau lebih sampel yang dipilih tidak ditemukan di sistem',
        'SAMPLE_NOT_FOUND'
      );
    }

    return PreparationRepository.createPreparations(input, targetSampleIds, user.sub);
  }

  /**
   * Mengambil daftar riwayat preparasi sampel
   */
  static async getPreparations(query: PreparationQueryFilter, user: JwtUserPayload) {
    let clientFilter: string | undefined;

    if (user.role === 'client' || user.role === 'klien') {
      clientFilter = user.username;
    }

    return PreparationRepository.findPreparations(query, clientFilter);
  }

  /**
   * Mengambil detail preparasi berdasarkan ID
   */
  static async getPreparationById(id: number, user: JwtUserPayload) {
    const prep = await PreparationRepository.findPreparationById(id);

    if (!prep) {
      throw AppError.notFound(
        `Catatan preparasi dengan ID ${id} tidak ditemukan`,
        'PREPARATION_NOT_FOUND'
      );
    }

    // Isolasi multi-tenant Klien
    if (user.role === 'client' || user.role === 'klien') {
      if (prep.sample.klien !== user.username) {
        throw AppError.forbidden(
          'Akses ditolak: Anda tidak memiliki izin melihat data preparasi sampel ini',
          'FORBIDDEN_CLIENT_PREPARATION_ACCESS'
        );
      }
    }

    return prep;
  }

  /**
   * Memperbarui catatan teknis preparasi sampel
   */
  static async updatePreparation(
    id: number,
    input: UpdatePreparationInput,
    user: JwtUserPayload
  ) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden(
        'Akses ditolak: Klien tidak memiliki izin memperbarui catatan preparasi',
        'FORBIDDEN_PREPARATION_UPDATE'
      );
    }

    const prep = await PreparationRepository.findPreparationById(id);
    if (!prep) {
      throw AppError.notFound(
        `Catatan preparasi dengan ID ${id} tidak ditemukan`,
        'PREPARATION_NOT_FOUND'
      );
    }

    return PreparationRepository.updatePreparation(id, input, user.sub);
  }

  /**
   * Menghapus catatan preparasi sampel
   */
  static async deletePreparation(id: number, user: JwtUserPayload) {
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      throw AppError.forbidden(
        'Akses ditolak: Hanya Admin atau Supervisor yang berwenang menghapus catatan preparasi',
        'FORBIDDEN_PREPARATION_DELETE'
      );
    }

    const prep = await PreparationRepository.findPreparationById(id);
    if (!prep) {
      throw AppError.notFound(
        `Catatan preparasi dengan ID ${id} tidak ditemukan`,
        'PREPARATION_NOT_FOUND'
      );
    }

    return PreparationRepository.deletePreparation(id, user.sub);
  }
}
