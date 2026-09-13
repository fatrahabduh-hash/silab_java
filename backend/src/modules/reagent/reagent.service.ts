import { ReagentRepository } from './reagent.repository.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/errors/app-error.js';
import { JwtUserPayload } from '../auth/auth.types.js';
import {
  CreateReagentInput,
  UpdateReagentInput,
  StockAdjustInput,
  ReagentFilterQuery,
} from './reagent.types.js';

export class ReagentService {
  private static repository = new ReagentRepository();

  /**
   * Helper untuk menghitung status stok dan sisa hari kadaluarsa
   */
  static enrichReagent(item: any) {
    const stok = Number(item.stok);
    const stokMinimum = Number(item.stokMinimum ?? 0);
    const isStokKritis = stok <= stokMinimum;

    let sisaHariKadaluarsa: number | null = null;
    let statusKadaluarsa: 'kadaluarsa' | 'segera' | 'aman' | 'tidak_ada' = 'tidak_ada';

    if (item.tanggalKadaluarsa) {
      const expDate = new Date(item.tanggalKadaluarsa);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = expDate.getTime() - today.getTime();
      sisaHariKadaluarsa = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (sisaHariKadaluarsa < 0) {
        statusKadaluarsa = 'kadaluarsa';
      } else if (sisaHariKadaluarsa <= 30) {
        statusKadaluarsa = 'segera';
      } else {
        statusKadaluarsa = 'aman';
      }
    }

    return {
      ...item,
      stok: Number(item.stok),
      stokMinimum: Number(item.stokMinimum ?? 0),
      isStokKritis,
      sisaHariKadaluarsa,
      statusKadaluarsa,
    };
  }

  /**
   * Mendapatkan daftar bahan kimia dengan filter dan pagination
   */
  static async getReagentList(query: ReagentFilterQuery) {
    let items = await this.repository.findMany(query);
    let total = await this.repository.count(query);

    let enriched = items.map((item) => this.enrichReagent(item));

    // Filter tambahan in-memory untuk statusStok jika diminta
    if (query.statusStok) {
      if (query.statusStok === 'kritis') {
        enriched = enriched.filter((item) => item.isStokKritis);
      } else if (query.statusStok === 'aman') {
        enriched = enriched.filter((item) => !item.isStokKritis);
      }
      total = enriched.length;
    }

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
   * Mendapatkan detail bahan kimia berdasarkan ID
   */
  static async getReagentById(id: number) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(
        `Bahan/Reagen dengan ID ${id} tidak ditemukan`,
        'REAGENT_NOT_FOUND'
      );
    }
    return this.enrichReagent(item);
  }

  /**
   * Ringkasan statistik inventaris bahan kimia
   */
  static async getStats() {
    return this.repository.getStats();
  }

  /**
   * Registrasi bahan kimia baru
   */
  static async createReagent(input: CreateReagentInput, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden(
        'Akses ditolak: Klien tidak memiliki izin mengelola bahan kimia lab',
        'FORBIDDEN_REAGENT_CREATE'
      );
    }

    const existing = await this.repository.findByKode(input.kodeBahan);
    if (existing) {
      throw AppError.conflict(
        `Kode bahan '${input.kodeBahan}' sudah terdaftar pada sistem`,
        'DUPLICATE_KODE_BAHAN'
      );
    }

    const created = await this.repository.create({
      kodeBahan: input.kodeBahan,
      nama: input.nama,
      stok: input.stok ?? 0,
      satuan: input.satuan || 'gr',
      stokMinimum: input.stokMinimum ?? 0,
      supplier: input.supplier || null,
      tanggalKadaluarsa: input.tanggalKadaluarsa
        ? new Date(input.tanggalKadaluarsa)
        : null,
    });

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Tambah bahan kimia: ${created.nama} (${created.kodeBahan}) - Stok: ${created.stok} ${created.satuan}`,
        modul: 'REAGENT',
      },
    });

    return this.enrichReagent(created);
  }

  /**
   * Perbarui informasi bahan kimia
   */
  static async updateReagent(id: number, input: UpdateReagentInput, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden(
        'Akses ditolak: Klien tidak memiliki izin memperbarui bahan kimia',
        'FORBIDDEN_REAGENT_UPDATE'
      );
    }

    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(
        `Bahan/Reagen dengan ID ${id} tidak ditemukan`,
        'REAGENT_NOT_FOUND'
      );
    }

    const dataToUpdate: any = {};
    if (input.nama !== undefined) dataToUpdate.nama = input.nama;
    if (input.satuan !== undefined) dataToUpdate.satuan = input.satuan;
    if (input.stokMinimum !== undefined) dataToUpdate.stokMinimum = input.stokMinimum;
    if (input.supplier !== undefined) dataToUpdate.supplier = input.supplier;
    if (input.tanggalKadaluarsa !== undefined) {
      dataToUpdate.tanggalKadaluarsa = input.tanggalKadaluarsa
        ? new Date(input.tanggalKadaluarsa)
        : null;
    }

    const updated = await this.repository.update(id, dataToUpdate);

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Perbarui bahan kimia ${updated.kodeBahan} (${updated.nama})`,
        modul: 'REAGENT',
      },
    });

    return this.enrichReagent(updated);
  }

  /**
   * Penyesuaian stok bahan kimia (masuk / keluar / stok opname)
   */
  static async adjustStock(id: number, input: StockAdjustInput, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden(
        'Akses ditolak: Klien tidak memiliki izin mengubah stok bahan kimia',
        'FORBIDDEN_STOCK_ADJUST'
      );
    }

    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(
        `Bahan/Reagen dengan ID ${id} tidak ditemukan`,
        'REAGENT_NOT_FOUND'
      );
    }

    const currentStok = Number(item.stok);
    let newStok = currentStok;

    if (input.jenis === 'masuk') {
      newStok = currentStok + input.jumlah;
    } else if (input.jenis === 'keluar') {
      if (input.jumlah > currentStok) {
        throw AppError.badRequest(
          `Pengurangan stok (${input.jumlah} ${item.satuan}) melebihi stok yang tersedia saat ini (${currentStok} ${item.satuan})`,
          'INSUFFICIENT_STOCK'
        );
      }
      newStok = currentStok - input.jumlah;
    } else if (input.jenis === 'opname') {
      newStok = input.jumlah;
    }

    const updated = await this.repository.update(id, {
      stok: newStok,
    });

    const keteranganMsg = input.keterangan ? ` - Keterangan: ${input.keterangan}` : '';
    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Mutasi stok '${input.jenis}' bahan ${item.kodeBahan}: ${currentStok} -> ${newStok} ${item.satuan}${keteranganMsg}`,
        modul: 'REAGENT',
      },
    });

    return {
      ...this.enrichReagent(updated),
      stokSebelumnya: currentStok,
      stokSekarang: newStok,
      jenisMutasi: input.jenis,
      perubahan: input.jumlah,
    };
  }

  /**
   * Hapus bahan kimia (Khusus Admin / Supervisor)
   */
  static async deleteReagent(id: number, user: JwtUserPayload) {
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      throw AppError.forbidden(
        'Hanya Admin atau Supervisor yang berhak menghapus data bahan kimia',
        'FORBIDDEN_DELETE_REAGENT'
      );
    }

    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(
        `Bahan/Reagen dengan ID ${id} tidak ditemukan`,
        'REAGENT_NOT_FOUND'
      );
    }

    await this.repository.delete(id);

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Hapus bahan kimia: ${item.nama} (${item.kodeBahan})`,
        modul: 'REAGENT',
      },
    });

    return { id, kodeBahan: item.kodeBahan, deleted: true };
  }
}
