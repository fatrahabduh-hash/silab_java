import { TariffRepository } from './tariff.repository.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/errors/app-error.js';
import { JwtUserPayload } from '../auth/auth.types.js';
import { CreateTariffInput, UpdateTariffInput, TariffFilterQuery } from './tariff.types.js';

export class TariffService {
  private static repository = new TariffRepository();

  static enrichTariff(item: any) {
    return {
      ...item,
      harga: Number(item.harga),
    };
  }

  static async getTariffList(query: TariffFilterQuery) {
    const [items, total] = await Promise.all([
      this.repository.findMany(query),
      this.repository.count(query),
    ]);

    const enriched = items.map((i) => this.enrichTariff(i));
    const page = query.page || 1;
    const limit = query.limit || 50;

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

  static async getTariffById(id: number) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(`Tarif pengujian dengan ID ${id} tidak ditemukan`, 'TARIFF_NOT_FOUND');
    }
    return this.enrichTariff(item);
  }

  static async createTariff(input: CreateTariffInput, user: JwtUserPayload) {
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      throw AppError.forbidden('Hanya Admin atau Supervisor yang berhak menambah tarif pengujian', 'FORBIDDEN_TARIFF_CREATE');
    }

    const created = await this.repository.create({
      nama: input.nama,
      metode: input.metode || null,
      parameter: input.parameter || null,
      harga: input.harga,
      satuan: input.satuan || 'per parameter',
      aktif: input.aktif ?? true,
    });

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Tambah tarif pengujian baru: ${created.nama} (Rp ${Number(created.harga).toLocaleString('id-ID')})`,
        modul: 'TARIFF',
      },
    });

    return this.enrichTariff(created);
  }

  static async updateTariff(id: number, input: UpdateTariffInput, user: JwtUserPayload) {
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      throw AppError.forbidden('Hanya Admin atau Supervisor yang berhak mengubah tarif pengujian', 'FORBIDDEN_TARIFF_UPDATE');
    }

    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(`Tarif pengujian dengan ID ${id} tidak ditemukan`, 'TARIFF_NOT_FOUND');
    }

    const dataToUpdate: any = {};
    if (input.nama !== undefined) dataToUpdate.nama = input.nama;
    if (input.metode !== undefined) dataToUpdate.metode = input.metode;
    if (input.parameter !== undefined) dataToUpdate.parameter = input.parameter;
    if (input.harga !== undefined) dataToUpdate.harga = input.harga;
    if (input.satuan !== undefined) dataToUpdate.satuan = input.satuan;
    if (input.aktif !== undefined) dataToUpdate.aktif = input.aktif;

    const updated = await this.repository.update(id, dataToUpdate);

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Perbarui tarif pengujian #${id}: ${updated.nama}`,
        modul: 'TARIFF',
      },
    });

    return this.enrichTariff(updated);
  }

  static async deleteTariff(id: number, user: JwtUserPayload) {
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      throw AppError.forbidden('Hanya Admin atau Supervisor yang berhak menghapus tarif pengujian', 'FORBIDDEN_TARIFF_DELETE');
    }

    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(`Tarif pengujian dengan ID ${id} tidak ditemukan`, 'TARIFF_NOT_FOUND');
    }

    if (item._count.invoiceItems > 0) {
      // Jika pernah dipakai pada invoice, nonaktifkan (soft-delete) agar jejak invoice masa lalu tidak rusak
      const deactivated = await this.repository.update(id, { aktif: false });
      await prisma.activityLog.create({
        data: {
          penggunaId: user.sub,
          aksi: `Nonaktifkan tarif pengujian #${id}: ${item.nama} karena terhubung dengan ${item._count.invoiceItems} item invoice`,
          modul: 'TARIFF',
        },
      });
      return {
        id,
        nama: item.nama,
        deleted: false,
        deactivated: true,
        message: `Tarif dinonaktifkan karena telah digunakan pada ${item._count.invoiceItems} invoice`,
      };
    }

    await this.repository.delete(id);

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Hapus tarif pengujian #${id}: ${item.nama}`,
        modul: 'TARIFF',
      },
    });

    return { id, nama: item.nama, deleted: true };
  }
}
