import { prisma } from '../../config/database.js';
import {
  CreatePreparationInput,
  UpdatePreparationInput,
  PreparationQueryFilter,
  ReagentUsageItem,
} from './preparation.types.js';
import { Prisma } from '@prisma/client';

export class PreparationRepository {
  /**
   * Mengambil daftar reagen kimia siap pakai dari tabel bahan
   */
  static async getAvailableReagents() {
    return prisma.chemicalReagent.findMany({
      orderBy: { nama: 'asc' },
    });
  }

  /**
   * Transaksi atomik pencatatan preparasi sampel
   */
  static async createPreparations(
    input: CreatePreparationInput,
    sampelIds: number[],
    userId: number
  ) {
    const jumlahSampel = sampelIds.length;
    const tglPrep = input.tanggalPreparasi
      ? new Date(input.tanggalPreparasi)
      : new Date();
    const faktor = input.faktorPengenceran !== undefined ? input.faktorPengenceran : 1.0;

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Pengurangan stok reagen proporsional dan pembuatan snapshot JSON
      let reagenDetailJson: string | null = null;
      if (input.reagen && input.reagen.length > 0) {
        const reagenSnapshot: Array<ReagentUsageItem & { nama: string; kode: string }> = [];

        for (const r of input.reagen) {
          if (!r.bahanId || r.jumlah <= 0) continue;

          const totalPakai = r.jumlah * jumlahSampel;

          const bahan = await tx.chemicalReagent.findUnique({
            where: { id: r.bahanId },
          });

          if (bahan) {
            const currentStock = Number(bahan.stok);
            const newStock = Math.max(0, currentStock - totalPakai);

            await tx.chemicalReagent.update({
              where: { id: r.bahanId },
              data: {
                stok: new Prisma.Decimal(newStock),
              },
            });

            reagenSnapshot.push({
              bahanId: r.bahanId,
              nama: bahan.nama,
              kode: bahan.kodeBahan,
              jumlah: r.jumlah,
              satuan: r.satuan || bahan.satuan || '',
              lot: r.lot || '',
            });
          }
        }

        if (reagenSnapshot.length > 0) {
          reagenDetailJson = JSON.stringify(reagenSnapshot);
        }
      }

      // 2. Simpan catatan preparasi untuk setiap sampel
      const createdRecords = [];
      for (const sid of sampelIds) {
        const prep = await tx.samplePreparation.create({
          data: {
            workOrderId: input.workOrderId || null,
            sampelId: sid,
            metodePreparasi: input.metodePreparasi,
            prosedur: input.prosedur || null,
            faktorPengenceran: new Prisma.Decimal(faktor),
            volumeAwalMl:
              input.volumeAwalMl !== undefined && input.volumeAwalMl !== null
                ? new Prisma.Decimal(input.volumeAwalMl)
                : null,
            volumeAkhirMl:
              input.volumeAkhirMl !== undefined && input.volumeAkhirMl !== null
                ? new Prisma.Decimal(input.volumeAkhirMl)
                : null,
            reagenDetail: reagenDetailJson,
            blankoDisiapkan: input.blankoDisiapkan ?? false,
            standarDisiapkan: input.standarDisiapkan ?? false,
            spikeDisiapkan: input.spikeDisiapkan ?? false,
            duplikatDisiapkan: input.duplikatDisiapkan ?? false,
            suhuRuang:
              input.suhuRuang !== undefined && input.suhuRuang !== null
                ? new Prisma.Decimal(input.suhuRuang)
                : null,
            kelembaban:
              input.kelembaban !== undefined && input.kelembaban !== null
                ? new Prisma.Decimal(input.kelembaban)
                : null,
            catatan: input.catatan || null,
            analisId: input.analisId || userId,
            tanggalPreparasi: tglPrep,
          },
          include: {
            sample: true,
            workOrder: true,
            analyst: {
              select: { id: true, nama: true, username: true },
            },
          },
        });
        createdRecords.push(prep);

        // 3. Propagasi faktor pengenceran ke hasil_uji jika pengujian sudah ada
        if (faktor !== 1.0) {
          await tx.$executeRaw`
            UPDATE hasil_uji 
            SET faktor_pengenceran = ${faktor},
                nilai_terkoreksi = nilai * ${faktor} * COALESCE(faktor_konversi, 1)
            WHERE sampel_id = ${sid}
          `;
        }
      }

      // 4. Catat Jejak Audit ke log_aktivitas
      await tx.activityLog.create({
        data: {
          penggunaId: userId,
          modul: 'preparasi',
          aksi: `PREPARASI_CREATED: ${jumlahSampel} sampel dipreparasi (Metode: ${input.metodePreparasi})`,
        },
      });

      return createdRecords;
    });
  }

  /**
   * Mengambil daftar preparasi dengan pagination dan filter
   */
  static async findPreparations(query: PreparationQueryFilter, clientFilter?: string) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SamplePreparationWhereInput = {};

    if (query.workOrderId) {
      where.workOrderId = query.workOrderId;
    }

    if (query.sampelId) {
      where.sampelId = query.sampelId;
    }

    if (query.metodePreparasi) {
      where.metodePreparasi = query.metodePreparasi;
    }

    if (query.analisId) {
      where.analisId = query.analisId;
    }

    if (query.dateFrom || query.dateTo) {
      where.tanggalPreparasi = {};
      if (query.dateFrom) {
        where.tanggalPreparasi.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.tanggalPreparasi.lte = new Date(query.dateTo);
      }
    }

    // Filter pencarian
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { sample: { kodeSampel: { contains: s } } },
        { sample: { jenisMaterial: { contains: s } } },
        { workOrder: { nomorWo: { contains: s } } },
        { catatan: { contains: s } },
      ];
    }

    // Filter multi-tenant Klien
    if (clientFilter) {
      where.sample = {
        klien: clientFilter,
      };
    }

    const [total, items] = await Promise.all([
      prisma.samplePreparation.count({ where }),
      prisma.samplePreparation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          sample: {
            select: {
              id: true,
              kodeSampel: true,
              jenisMaterial: true,
              klien: true,
              status: true,
              receipt: {
                select: {
                  id: true,
                  nomorPenerimaan: true,
                },
              },
            },
          },
          workOrder: {
            select: {
              id: true,
              nomorWo: true,
              prioritas: true,
              status: true,
            },
          },
          analyst: {
            select: {
              id: true,
              nama: true,
              username: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mengambil detail preparasi berdasarkan ID
   */
  static async findPreparationById(id: number) {
    return prisma.samplePreparation.findUnique({
      where: { id },
      include: {
        sample: {
          include: {
            receipt: true,
          },
        },
        workOrder: {
          include: {
            equipment: true,
          },
        },
        analyst: {
          select: {
            id: true,
            nama: true,
            username: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Memperbarui catatan preparasi sampel
   */
  static async updatePreparation(id: number, input: UpdatePreparationInput, userId: number) {
    const data: Prisma.SamplePreparationUpdateInput = {};

    if (input.prosedur !== undefined) data.prosedur = input.prosedur;
    if (input.catatan !== undefined) data.catatan = input.catatan;
    if (input.blankoDisiapkan !== undefined) data.blankoDisiapkan = input.blankoDisiapkan;
    if (input.standarDisiapkan !== undefined) data.standarDisiapkan = input.standarDisiapkan;
    if (input.spikeDisiapkan !== undefined) data.spikeDisiapkan = input.spikeDisiapkan;
    if (input.duplikatDisiapkan !== undefined) data.duplikatDisiapkan = input.duplikatDisiapkan;
    if (input.volumeAwalMl !== undefined) {
      data.volumeAwalMl =
        input.volumeAwalMl !== null ? new Prisma.Decimal(input.volumeAwalMl) : null;
    }
    if (input.volumeAkhirMl !== undefined) {
      data.volumeAkhirMl =
        input.volumeAkhirMl !== null ? new Prisma.Decimal(input.volumeAkhirMl) : null;
    }
    if (input.suhuRuang !== undefined) {
      data.suhuRuang =
        input.suhuRuang !== null ? new Prisma.Decimal(input.suhuRuang) : null;
    }
    if (input.kelembaban !== undefined) {
      data.kelembaban =
        input.kelembaban !== null ? new Prisma.Decimal(input.kelembaban) : null;
    }
    if (input.tanggalPreparasi) {
      data.tanggalPreparasi = new Date(input.tanggalPreparasi);
    }
    if (input.analisId) {
      data.analyst = { connect: { id: input.analisId } };
    }

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (input.faktorPengenceran !== undefined) {
        data.faktorPengenceran = new Prisma.Decimal(input.faktorPengenceran);

        const existing = await tx.samplePreparation.findUnique({
          where: { id },
          select: { sampelId: true },
        });

        if (existing) {
          const faktor = input.faktorPengenceran;
          await tx.$executeRaw`
            UPDATE hasil_uji 
            SET faktor_pengenceran = ${faktor},
                nilai_terkoreksi = nilai * ${faktor} * COALESCE(faktor_konversi, 1)
            WHERE sampel_id = ${existing.sampelId}
          `;
        }
      }

      const updated = await tx.samplePreparation.update({
        where: { id },
        data,
        include: {
          sample: true,
          workOrder: true,
          analyst: {
            select: { id: true, nama: true, username: true },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          penggunaId: userId,
          modul: 'preparasi',
          aksi: `PREPARASI_UPDATED: ID #${id}`,
        },
      });

      return updated;
    });
  }

  /**
   * Menghapus catatan preparasi sampel
   */
  static async deletePreparation(id: number, userId: number) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const deleted = await tx.samplePreparation.delete({
        where: { id },
      });

      await tx.activityLog.create({
        data: {
          penggunaId: userId,
          modul: 'preparasi',
          aksi: `PREPARASI_DELETED: ID #${id}`,
        },
      });

      return deleted;
    });
  }
}
