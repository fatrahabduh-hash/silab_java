import { EquipmentRepository } from './equipment.repository.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/errors/app-error.js';
import { JwtUserPayload } from '../auth/auth.types.js';
import {
  CreateEquipmentInput,
  UpdateEquipmentInput,
  LogUsageInput,
  EquipmentFilterQuery,
  EquipmentStatus,
} from './equipment.types.js';

export class EquipmentService {
  private static repository = new EquipmentRepository();

  /**
   * Helper untuk menghitung status & sisa hari kalibrasi
   */
  static enrichEquipment(item: any) {
    let sisaHariKalibrasi: number | null = null;
    let kalibrasiStatus: 'kadaluarsa' | 'segera' | 'valid' | 'tidak_ada' = 'tidak_ada';

    if (item.masaBerlakuKalibrasi) {
      const expDate = new Date(item.masaBerlakuKalibrasi);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = expDate.getTime() - today.getTime();
      sisaHariKalibrasi = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (sisaHariKalibrasi < 0) {
        kalibrasiStatus = 'kadaluarsa';
      } else if (sisaHariKalibrasi <= 30) {
        kalibrasiStatus = 'segera';
      } else {
        kalibrasiStatus = 'valid';
      }
    }

    return {
      ...item,
      sisaHariKalibrasi,
      kalibrasiStatus,
    };
  }

  /**
   * Mendapatkan daftar peralatan dengan filter dan pagination
   */
  static async getEquipmentList(query: EquipmentFilterQuery) {
    const [items, total] = await Promise.all([
      this.repository.findMany(query),
      this.repository.count(query),
    ]);

    const enriched = items.map((item) => this.enrichEquipment(item));

    const page = query.page || 1;
    const limit = query.limit || 20;

    return {
      data: enriched,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Mendapatkan detail peralatan berdasarkan ID
   */
  static async getEquipmentById(id: number) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(
        `Peralatan dengan ID ${id} tidak ditemukan`,
        'EQUIPMENT_NOT_FOUND'
      );
    }
    return this.enrichEquipment(item);
  }

  /**
   * Mendapatkan ringkasan statistik inventaris peralatan
   */
  static async getStats() {
    return this.repository.getStats();
  }

  /**
   * Registrasi peralatan baru
   */
  static async createEquipment(input: CreateEquipmentInput, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden(
        'Akses ditolak: Klien tidak memiliki izin mengelola peralatan lab',
        'FORBIDDEN_EQUIPMENT_CREATE'
      );
    }

    const existing = await this.repository.findByKode(input.kodeAlat);
    if (existing) {
      throw AppError.conflict(
        `Kode alat '${input.kodeAlat}' sudah terdaftar pada sistem`,
        'DUPLICATE_KODE_ALAT'
      );
    }

    const created = await this.repository.create({
      kodeAlat: input.kodeAlat,
      nama: input.nama,
      lokasi: input.lokasi || null,
      status: input.status || 'tersedia',
      tanggalKalibrasi: input.tanggalKalibrasi ? new Date(input.tanggalKalibrasi) : null,
      masaBerlakuKalibrasi: input.masaBerlakuKalibrasi
        ? new Date(input.masaBerlakuKalibrasi)
        : null,
      jamPakai: input.jamPakai ?? 0,
      jadwalMaintenance: input.jadwalMaintenance
        ? new Date(input.jadwalMaintenance)
        : null,
      pic: input.pic || null,
      catatan: input.catatan || null,
    });

    // Catat log aktivitas
    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Tambah peralatan baru: ${created.nama} (${created.kodeAlat})`,
        modul: 'EQUIPMENT',
      },
    });

    return this.enrichEquipment(created);
  }

  /**
   * Update data spesifikasi peralatan
   */
  static async updateEquipment(
    id: number,
    input: UpdateEquipmentInput,
    user: JwtUserPayload
  ) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden(
        'Akses ditolak: Klien tidak memiliki izin mengubah data peralatan',
        'FORBIDDEN_EQUIPMENT_UPDATE'
      );
    }

    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(
        `Peralatan dengan ID ${id} tidak ditemukan`,
        'EQUIPMENT_NOT_FOUND'
      );
    }

    const dataToUpdate: any = {};
    if (input.nama !== undefined) dataToUpdate.nama = input.nama;
    if (input.lokasi !== undefined) dataToUpdate.lokasi = input.lokasi;
    if (input.status !== undefined) dataToUpdate.status = input.status;
    if (input.jamPakai !== undefined) dataToUpdate.jamPakai = input.jamPakai;
    if (input.pic !== undefined) dataToUpdate.pic = input.pic;
    if (input.catatan !== undefined) dataToUpdate.catatan = input.catatan;

    if (input.tanggalKalibrasi !== undefined) {
      dataToUpdate.tanggalKalibrasi = input.tanggalKalibrasi
        ? new Date(input.tanggalKalibrasi)
        : null;
    }
    if (input.masaBerlakuKalibrasi !== undefined) {
      dataToUpdate.masaBerlakuKalibrasi = input.masaBerlakuKalibrasi
        ? new Date(input.masaBerlakuKalibrasi)
        : null;
    }
    if (input.jadwalMaintenance !== undefined) {
      dataToUpdate.jadwalMaintenance = input.jadwalMaintenance
        ? new Date(input.jadwalMaintenance)
        : null;
    }

    const updated = await this.repository.update(id, dataToUpdate);

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Perbarui peralatan ${updated.kodeAlat}`,
        modul: 'EQUIPMENT',
      },
    });

    return this.enrichEquipment(updated);
  }

  /**
   * Pembaruan cepat status kondisi operasional
   */
  static async updateStatus(
    id: number,
    status: EquipmentStatus,
    user: JwtUserPayload
  ) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden(
        'Akses ditolak: Klien tidak memiliki izin mengubah status alat',
        'FORBIDDEN_STATUS_UPDATE'
      );
    }

    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(
        `Peralatan dengan ID ${id} tidak ditemukan`,
        'EQUIPMENT_NOT_FOUND'
      );
    }

    const updated = await this.repository.update(id, { status });

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Ubah status peralatan ${item.kodeAlat} dari '${item.status}' menjadi '${status}'`,
        modul: 'EQUIPMENT',
      },
    });

    return this.enrichEquipment(updated);
  }

  /**
   * Tambah jam pemakaian operasional alat
   */
  static async logUsage(id: number, input: LogUsageInput, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden(
        'Akses ditolak: Klien tidak memiliki izin mencatat jam pemakaian alat',
        'FORBIDDEN_LOG_USAGE'
      );
    }

    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(
        `Peralatan dengan ID ${id} tidak ditemukan`,
        'EQUIPMENT_NOT_FOUND'
      );
    }

    const currentJam = item.jamPakai ?? 0;
    const newJam = currentJam + input.tambahanJam;

    const updated = await this.repository.update(id, {
      jamPakai: newJam,
    });

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Tambah ${input.tambahanJam} jam pemakaian alat ${item.kodeAlat} (Total: ${newJam} jam)${input.catatan ? ` - ${input.catatan}` : ''}`,
        modul: 'EQUIPMENT',
      },
    });

    return this.enrichEquipment(updated);
  }

  /**
   * Hapus data peralatan (Hanya Admin / Supervisor)
   */
  static async deleteEquipment(id: number, user: JwtUserPayload) {
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      throw AppError.forbidden(
        'Hanya Admin atau Supervisor yang berhak menghapus data peralatan',
        'FORBIDDEN_DELETE_EQUIPMENT'
      );
    }

    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(
        `Peralatan dengan ID ${id} tidak ditemukan`,
        'EQUIPMENT_NOT_FOUND'
      );
    }

    const { woCount, testCount } = await this.repository.checkActiveReferences(id);
    if (woCount > 0 || testCount > 0) {
      throw AppError.badRequest(
        `Peralatan ${item.kodeAlat} tidak dapat dihapus karena masih terhubung dengan ${woCount} Work Order dan ${testCount} Hasil Uji laboratorium. Nonaktifkan status alat ke 'rusak' atau ubah referensinya terlebih dahulu.`,
        'EQUIPMENT_HAS_REFERENCES'
      );
    }

    await this.repository.delete(id);

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Hapus peralatan: ${item.nama} (${item.kodeAlat})`,
        modul: 'EQUIPMENT',
      },
    });

    return { id, kodeAlat: item.kodeAlat, deleted: true };
  }
}
