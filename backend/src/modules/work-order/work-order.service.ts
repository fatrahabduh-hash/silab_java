import { WorkOrderRepository } from './work-order.repository.js';
import { SampleRepository } from '../sample/sample.repository.js';
import { AppError } from '../../common/errors/app-error.js';
import { JwtUserPayload } from '../auth/auth.types.js';
import {
  CreateWorkOrderInput,
  UpdateWorkOrderStatusInput,
  WorkOrderQueryFilter,
} from './work-order.types.js';

export class WorkOrderService {
  /**
   * Terbitkan Work Order baru
   */
  static async createWorkOrder(input: CreateWorkOrderInput, user: JwtUserPayload) {
    // 1. Otorisasi Peran: Hanya Admin dan Supervisor yang berhak menerbitkan Work Order
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      throw AppError.forbidden(
        'Akses ditolak: Hanya Admin atau Supervisor yang memiliki wewenang menerbitkan Work Order laboratorium',
        'FORBIDDEN_WORK_ORDER_CREATION'
      );
    }

    // 2. Tentukan nomor Work Order (auto-generate jika kosong)
    let nomorWo = input.nomorWo?.trim();
    if (!nomorWo) {
      nomorWo = await WorkOrderRepository.generateWorkOrderNumber();
    } else {
      const existing = await WorkOrderRepository.findWorkOrderByNomor(nomorWo);
      if (existing) {
        throw AppError.conflict(
          `Nomor Work Order '${nomorWo}' sudah digunakan dalam sistem`,
          'WORK_ORDER_NUMBER_EXISTS'
        );
      }
    }

    // 3. Validasi rentang jadwal
    if (input.jadwalMulai && input.jadwalSelesai) {
      const mulai = new Date(input.jadwalMulai);
      const selesai = new Date(input.jadwalSelesai);
      if (selesai < mulai) {
        throw AppError.badRequest(
          'Target jadwal selesai tidak boleh mendahului jadwal mulai pengujian',
          'INVALID_SCHEDULE_RANGE'
        );
      }
    }

    // 4. Pengumpulan sampel berdasarkan mode
    let targetSampleIds: number[] = [];

    if (input.mode === 'batch') {
      if (!input.penerimaanId) {
        throw AppError.badRequest('Nomor batch penerimaan wajib disertakan untuk mode batch', 'RECEIPT_ID_REQUIRED');
      }

      const receipt = await SampleRepository.findReceiptById(input.penerimaanId);
      if (!receipt) {
        throw AppError.notFound(
          `Data penerimaan batch dengan ID ${input.penerimaanId} tidak ditemukan`,
          'RECEIPT_NOT_FOUND'
        );
      }

      targetSampleIds = await WorkOrderRepository.findEligibleSamplesForBatch(input.penerimaanId);

      if (targetSampleIds.length === 0) {
        throw AppError.badRequest(
          'Tidak ada sampel yang tersedia dalam batch penerimaan ini (seluruh sampel telah selesai atau memiliki WO aktif)',
          'NO_AVAILABLE_SAMPLES_IN_BATCH'
        );
      }
    } else {
      const rawIds = input.sampelIds || [];
      if (rawIds.length === 0) {
        throw AppError.badRequest('Pilih minimal satu sampel untuk mode single/kolektif', 'SAMPLES_REQUIRED');
      }

      // Verifikasi ketersediaan masing-masing sampel
      for (const sid of rawIds) {
        const s = await SampleRepository.findSampleById(sid);
        if (!s) {
          throw AppError.notFound(`Sampel dengan ID ${sid} tidak ditemukan`, 'SAMPLE_NOT_FOUND');
        }
        if (s.status === 'selesai' || s.status === 'ditolak') {
          throw AppError.badRequest(
            `Sampel ${s.kodeSampel} berstatus '${s.status}' dan tidak dapat dimasukkan ke Work Order baru`,
            'SAMPLE_STATUS_INELIGIBLE'
          );
        }
      }
      targetSampleIds = rawIds;
    }

    // 5. Simpan Work Order dan pengikatan pivot sampel secara atomik
    const wo = await WorkOrderRepository.createWorkOrder(
      {
        ...input,
        nomorWo,
      },
      targetSampleIds,
      user.sub
    );

    // 6. Catat audit trail
    await SampleRepository.logActivity({
      userId: user.sub,
      action: `WO_CREATED: #${nomorWo} (${targetSampleIds.length} sampel) [Prioritas: ${input.prioritas || 'normal'}]`,
    });

    return WorkOrderRepository.findWorkOrderById(wo.id);
  }

  /**
   * Perbarui status Work Order (Aktivasi, Selesaikan, Batalkan)
   */
  static async updateStatus(
    id: number,
    input: UpdateWorkOrderStatusInput,
    user: JwtUserPayload
  ) {
    // 1. Role Klien dilarang mengubah Work Order
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden('Klien tidak memiliki akses ke pengelolaan Work Order laboratorium', 'FORBIDDEN');
    }

    const wo = await WorkOrderRepository.findWorkOrderById(id);
    if (!wo) {
      throw AppError.notFound(`Work Order dengan ID ${id} tidak ditemukan`, 'WORK_ORDER_NOT_FOUND');
    }

    // 2. Validasi Wewenang Analis
    if (user.role === 'analis') {
      if (input.status === 'dibatalkan') {
        throw AppError.forbidden(
          'Akses ditolak: Analis tidak berwenang membatalkan Work Order. Pembatalan harus dilakukan oleh Supervisor atau Admin.',
          'CANCEL_REQUIRES_SUPERVISOR'
        );
      }
      if (wo.analisId && wo.analisId !== user.sub) {
        throw AppError.forbidden(
          'Akses ditolak: Work Order ini dialokasikan untuk analis laboratorium lain.',
          'NOT_ASSIGNED_ANALYST'
        );
      }
    }

    // 3. Validasi State Machine Work Order
    const currentStatus = wo.status;
    const newStatus = input.status;

    if (currentStatus === 'selesai') {
      throw AppError.badRequest('Work Order telah selesai dan tidak dapat diubah lagi', 'TERMINAL_STATUS_LOCKED');
    }

    if (currentStatus === 'dibatalkan') {
      throw AppError.badRequest('Work Order telah dibatalkan dan tidak dapat diubah lagi', 'TERMINAL_STATUS_LOCKED');
    }

    if (currentStatus === newStatus) {
      return wo;
    }

    // Transisi yang diizinkan:
    // draft -> aktif, dibatalkan
    // aktif -> selesai, dibatalkan
    if (currentStatus === 'draft' && newStatus === 'selesai') {
      throw AppError.badRequest(
        'Work Order harus diaktifkan terlebih dahulu sebelum dapat diselesaikan',
        'INVALID_STATUS_TRANSITION'
      );
    }

    // 4. Update status dan sinkronkan sampel secara atomik
    await WorkOrderRepository.updateStatus(id, newStatus, input.catatan);

    // 5. Catat audit trail
    await SampleRepository.logActivity({
      userId: user.sub,
      action: `WO_STATUS_CHANGED: #${wo.nomorWo} [${currentStatus} -> ${newStatus}]`,
    });

    return WorkOrderRepository.findWorkOrderById(id);
  }

  /**
   * Ambil daftar Work Order
   */
  static async getWorkOrders(filter: WorkOrderQueryFilter, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden('Klien tidak memiliki akses ke Work Order internal laboratorium', 'FORBIDDEN');
    }

    return WorkOrderRepository.findAllWorkOrders(filter);
  }

  /**
   * Ambil detail Work Order
   */
  static async getWorkOrderById(id: number, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden('Klien tidak memiliki akses ke Work Order internal laboratorium', 'FORBIDDEN');
    }

    const wo = await WorkOrderRepository.findWorkOrderById(id);
    if (!wo) {
      throw AppError.notFound(`Work Order dengan ID ${id} tidak ditemukan`, 'WORK_ORDER_NOT_FOUND');
    }
    return wo;
  }

  /**
   * Ambil daftar sampel yang siap dimasukkan ke Work Order baru
   */
  static async getAvailableSamples(user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden('Klien tidak memiliki akses ke daftar ini', 'FORBIDDEN');
    }

    return WorkOrderRepository.findAvailableSamples();
  }
}
