import { prisma } from '../../config/database.js';
import {
  CreateTestResultInput,
  CreateBatchTestResultInput,
  UpdateTestResultInput,
  TestResultQueryFilter,
  TestConclusion,
} from './test-result.types.js';
import { Prisma } from '@prisma/client';

export class TestResultRepository {
  /**
   * Menghasilkan kode uji otomatis berurutan (format U-XXX)
   */
  static async generateTestCode(tx?: Prisma.TransactionClient): Promise<string> {
    const client = tx || prisma;
    const last = await client.testResult.findFirst({
      orderBy: { id: 'desc' },
      select: { kodeUji: true },
    });

    if (!last || !last.kodeUji) {
      return 'U-001';
    }

    const numPart = parseInt(last.kodeUji.replace(/\D/g, ''), 10);
    const nextNum = isNaN(numPart) ? 1 : numPart + 1;
    return `U-${String(nextNum).padStart(3, '0')}`;
  }

  /**
   * Menghitung nilai terkoreksi berdasarkan faktor pengenceran dan konversi
   */
  static calculateCorrectedValue(
    nilai: number,
    faktorPengenceran: number = 1.0,
    faktorKonversi: number = 1.0
  ): number {
    return Number((nilai * faktorPengenceran * faktorKonversi).toFixed(4));
  }

  /**
   * Evaluasi kesimpulan mutu pengujian (lulus/tidak_lulus/pending)
   */
  static evaluateConclusion(
    nilaiTerkoreksi: number,
    batasMin?: number | null,
    batasMaks?: number | null,
    currentKesimpulan?: TestConclusion
  ): TestConclusion {
    const hasMin = batasMin !== undefined && batasMin !== null;
    const hasMax = batasMaks !== undefined && batasMaks !== null;

    if (hasMin && nilaiTerkoreksi < batasMin!) {
      return 'tidak_lulus';
    }
    if (hasMax && nilaiTerkoreksi > batasMaks!) {
      return 'tidak_lulus';
    }
    if (hasMin || hasMax) {
      return 'lulus';
    }
    return currentKesimpulan || 'pending';
  }

  /**
   * Transaksi atomik pencatatan hasil uji tunggal
   */
  static async createTestResult(input: CreateTestResultInput, userId: number) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Tentukan nomor referensi dan preparasi sampel
      const sample = await tx.sample.findUnique({
        where: { id: input.sampelId },
        include: { receipt: true, preparations: { orderBy: { id: 'desc' }, take: 1 } },
      });

      const noRef = input.noReferensi || sample?.receipt?.nomorPenerimaan || null;
      const latestPrep = sample?.preparations?.[0];
      const preparasiId = input.preparasiId || latestPrep?.id || null;
      const faktorPengenceran =
        input.faktorPengenceran !== undefined
          ? input.faktorPengenceran
          : latestPrep
          ? Number(latestPrep.faktorPengenceran)
          : 1.0;
      const faktorKonversi = input.faktorKonversi !== undefined ? input.faktorKonversi : 1.0;

      // 2. Kode Uji Otomatis
      const kodeUji = input.kodeUji?.trim() || (await this.generateTestCode(tx));

      // 3. Kalkulasi Nilai Terkoreksi & Evaluasi Kesimpulan
      const nilaiTerkoreksi = this.calculateCorrectedValue(
        input.nilai,
        faktorPengenceran,
        faktorKonversi
      );
      const kesimpulan = this.evaluateConclusion(
        nilaiTerkoreksi,
        input.batasMin,
        input.batasMaks,
        input.kesimpulan
      );

      const tglUji = input.tanggalUji ? new Date(input.tanggalUji) : new Date();

      // 4. Simpan ke tabel hasil_uji
      const created = await tx.testResult.create({
        data: {
          kodeUji,
          sampelId: input.sampelId,
          noReferensi: noRef,
          preparasiId,
          parameter: input.parameter,
          nilai: new Prisma.Decimal(input.nilai),
          faktorPengenceran: new Prisma.Decimal(faktorPengenceran),
          nilaiTerkoreksi: new Prisma.Decimal(nilaiTerkoreksi),
          satuan: input.satuan || '%',
          faktorKonversi: new Prisma.Decimal(faktorKonversi),
          batasMin: input.batasMin !== undefined && input.batasMin !== null ? new Prisma.Decimal(input.batasMin) : null,
          batasMaks: input.batasMaks !== undefined && input.batasMaks !== null ? new Prisma.Decimal(input.batasMaks) : null,
          metode: input.metode || 'AAS',
          alatId: input.alatId || null,
          analisId: input.analisId || userId,
          kesimpulan,
          catatan: input.catatan || null,
          tanggalUji: tglUji,
        },
        include: {
          sample: {
            include: { receipt: true },
          },
          preparation: true,
          equipment: true,
          analyst: {
            select: { id: true, nama: true, username: true },
          },
        },
      });

      // 5. Perbarui status sampel jika masih antrian/diuji
      if (sample && (sample.status === 'antrian' || sample.status === 'diuji')) {
        await tx.sample.update({
          where: { id: input.sampelId },
          data: { status: 'review' },
        });
      }

      // 6. Sinkronisasi batch penerimaan jika semua sampel selesai diuji
      if (sample?.penerimaanId) {
        await this.syncReceiptCompletion(tx, sample.penerimaanId);
      }

      // 7. Jejak audit
      await tx.activityLog.create({
        data: {
          penggunaId: userId,
          modul: 'pengujian',
          aksi: `HASIL_UJI_CREATED: ${kodeUji} (${input.parameter}: ${input.nilai}${input.satuan || '%'} [${kesimpulan}])`,
        },
      });

      return created;
    });
  }

  /**
   * Transaksi atomik pencatatan hasil uji batch multi-baris
   */
  static async createBatchTestResults(input: CreateBatchTestResultInput, userId: number) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Ambil kode uji awal satu kali
      const last = await tx.testResult.findFirst({
        orderBy: { id: 'desc' },
        select: { kodeUji: true },
      });

      let nextNum = 1;
      if (last && last.kodeUji) {
        const numPart = parseInt(last.kodeUji.replace(/\D/g, ''), 10);
        if (!isNaN(numPart)) nextNum = numPart + 1;
      }

      const createdItems = [];
      const affectedSampleIds = new Set<number>();
      const affectedReceiptIds = new Set<number>();

      for (const row of input.rows) {
        const kodeUji = `U-${String(nextNum).padStart(3, '0')}`;
        nextNum++;

        // Info sampel
        const sample = await tx.sample.findUnique({
          where: { id: row.sampelId },
          include: { receipt: true, preparations: { orderBy: { id: 'desc' }, take: 1 } },
        });

        affectedSampleIds.add(row.sampelId);
        if (sample?.penerimaanId) affectedReceiptIds.add(sample.penerimaanId);

        const noRef = row.noReferensi || sample?.receipt?.nomorPenerimaan || null;
        const latestPrep = sample?.preparations?.[0];
        const preparasiId = row.preparasiId || latestPrep?.id || null;
        const faktorPengenceran =
          row.faktorPengenceran !== undefined
            ? row.faktorPengenceran
            : latestPrep
            ? Number(latestPrep.faktorPengenceran)
            : 1.0;
        const faktorKonversi = row.faktorKonversi !== undefined ? row.faktorKonversi : 1.0;

        const nilaiTerkoreksi = this.calculateCorrectedValue(
          row.nilai,
          faktorPengenceran,
          faktorKonversi
        );
        const kesimpulan = this.evaluateConclusion(
          nilaiTerkoreksi,
          row.batasMin,
          row.batasMaks,
          row.kesimpulan
        );

        const tglUji = input.tanggalUji ? new Date(input.tanggalUji) : new Date();

        const created = await tx.testResult.create({
          data: {
            kodeUji,
            sampelId: row.sampelId,
            noReferensi: noRef,
            preparasiId,
            parameter: row.parameter,
            nilai: new Prisma.Decimal(row.nilai),
            faktorPengenceran: new Prisma.Decimal(faktorPengenceran),
            nilaiTerkoreksi: new Prisma.Decimal(nilaiTerkoreksi),
            satuan: row.satuan || input.satuan || '%',
            faktorKonversi: new Prisma.Decimal(faktorKonversi),
            batasMin: row.batasMin !== undefined && row.batasMin !== null ? new Prisma.Decimal(row.batasMin) : null,
            batasMaks: row.batasMaks !== undefined && row.batasMaks !== null ? new Prisma.Decimal(row.batasMaks) : null,
            metode: row.metode || input.metode || 'AAS',
            alatId: input.alatId || null,
            analisId: input.analisId || userId,
            kesimpulan,
            catatan: row.catatan || null,
            tanggalUji: tglUji,
          },
        });

        createdItems.push(created);
      }

      // Perbarui status sampel yang terkena dampak
      await tx.sample.updateMany({
        where: {
          id: { in: Array.from(affectedSampleIds) },
          status: { in: ['antrian', 'diuji'] },
        },
        data: { status: 'review' },
      });

      // Sinkronisasi penerimaan batch
      for (const recId of affectedReceiptIds) {
        await this.syncReceiptCompletion(tx, recId);
      }

      // Jejak audit
      await tx.activityLog.create({
        data: {
          penggunaId: userId,
          modul: 'pengujian',
          aksi: `HASIL_UJI_BATCH_CREATED: ${createdItems.length} hasil uji dicatat secara kolektif`,
        },
      });

      return createdItems;
    });
  }

  /**
   * Helper internal: sinkronisasi status penerimaan jika seluruh sampel selesai diuji
   */
  private static async syncReceiptCompletion(tx: Prisma.TransactionClient, penerimaanId: number) {
    const totalSamples = await tx.sample.count({
      where: { penerimaanId },
    });

    const completedSamples = await tx.sample.count({
      where: {
        penerimaanId,
        status: { in: ['review', 'selesai'] },
      },
    });

    if (totalSamples > 0 && completedSamples === totalSamples) {
      await tx.sampleReceipt.update({
        where: { id: penerimaanId },
        data: { status: 'selesai' },
      });
    }
  }

  /**
   * Mengambil daftar hasil uji dengan pagination dan filter
   */
  static async findTestResults(query: TestResultQueryFilter, clientFilter?: string) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TestResultWhereInput = {};

    if (query.sampelId) where.sampelId = query.sampelId;
    if (query.kodeUji) where.kodeUji = { contains: query.kodeUji };
    if (query.parameter) where.parameter = { contains: query.parameter };
    if (query.kesimpulan) where.kesimpulan = query.kesimpulan;
    if (query.metode) where.metode = { contains: query.metode };
    if (query.analisId) where.analisId = query.analisId;
    if (query.alatId) where.alatId = query.alatId;

    if (query.penerimaanId || clientFilter) {
      where.sample = {
        ...(query.penerimaanId ? { penerimaanId: query.penerimaanId } : {}),
        ...(clientFilter ? { klien: clientFilter } : {}),
      };
    }

    if (query.dateFrom || query.dateTo) {
      where.tanggalUji = {};
      if (query.dateFrom) where.tanggalUji.gte = new Date(query.dateFrom);
      if (query.dateTo) where.tanggalUji.lte = new Date(query.dateTo);
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { kodeUji: { contains: s } },
        { parameter: { contains: s } },
        { noReferensi: { contains: s } },
        { sample: { kodeSampel: { contains: s } } },
        { sample: { klien: { contains: s } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.testResult.count({ where }),
      prisma.testResult.findMany({
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
          preparation: {
            select: {
              id: true,
              metodePreparasi: true,
              faktorPengenceran: true,
            },
          },
          equipment: {
            select: {
              id: true,
              kodeAlat: true,
              nama: true,
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
   * Mengambil detail hasil uji berdasarkan ID
   */
  static async findTestResultById(id: number) {
    return prisma.testResult.findUnique({
      where: { id },
      include: {
        sample: {
          include: { receipt: true },
        },
        preparation: true,
        equipment: true,
        analyst: {
          select: { id: true, nama: true, username: true, role: true },
        },
      },
    });
  }

  /**
   * Memperbarui hasil uji laboratorium
   */
  static async updateTestResult(id: number, input: UpdateTestResultInput, userId: number) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.testResult.findUnique({
        where: { id },
      });

      if (!existing) return null;

      const data: Prisma.TestResultUpdateInput = {};

      if (input.parameter !== undefined) data.parameter = input.parameter;
      if (input.satuan !== undefined) data.satuan = input.satuan;
      if (input.metode !== undefined) data.metode = input.metode;
      if (input.catatan !== undefined) data.catatan = input.catatan;
      if (input.alatId !== undefined) {
        data.equipment = input.alatId ? { connect: { id: input.alatId } } : { disconnect: true };
      }
      if (input.analisId !== undefined) {
        data.analyst = input.analisId ? { connect: { id: input.analisId } } : { disconnect: true };
      }
      if (input.tanggalUji) {
        data.tanggalUji = new Date(input.tanggalUji);
      }

      // Hitung ulang nilai terkoreksi & kesimpulan jika nilai atau faktor berubah
      const finalNilai = input.nilai !== undefined ? input.nilai : Number(existing.nilai);
      const finalFaktorPengenceran =
        input.faktorPengenceran !== undefined
          ? input.faktorPengenceran
          : Number(existing.faktorPengenceran);
      const finalFaktorKonversi =
        input.faktorKonversi !== undefined ? input.faktorKonversi : Number(existing.faktorKonversi);

      const finalBatasMin = input.batasMin !== undefined ? input.batasMin : (existing.batasMin ? Number(existing.batasMin) : null);
      const finalBatasMaks = input.batasMaks !== undefined ? input.batasMaks : (existing.batasMaks ? Number(existing.batasMaks) : null);

      if (input.nilai !== undefined) data.nilai = new Prisma.Decimal(input.nilai);
      if (input.faktorPengenceran !== undefined) data.faktorPengenceran = new Prisma.Decimal(input.faktorPengenceran);
      if (input.faktorKonversi !== undefined) data.faktorKonversi = new Prisma.Decimal(input.faktorKonversi);
      if (input.batasMin !== undefined) data.batasMin = input.batasMin !== null ? new Prisma.Decimal(input.batasMin) : null;
      if (input.batasMaks !== undefined) data.batasMaks = input.batasMaks !== null ? new Prisma.Decimal(input.batasMaks) : null;

      const nilaiTerkoreksi = this.calculateCorrectedValue(
        finalNilai,
        finalFaktorPengenceran,
        finalFaktorKonversi
      );
      data.nilaiTerkoreksi = new Prisma.Decimal(nilaiTerkoreksi);

      const kesimpulan = this.evaluateConclusion(
        nilaiTerkoreksi,
        finalBatasMin,
        finalBatasMaks,
        input.kesimpulan || existing.kesimpulan || undefined
      );
      data.kesimpulan = kesimpulan;

      const updated = await tx.testResult.update({
        where: { id },
        data,
        include: {
          sample: true,
          preparation: true,
          equipment: true,
          analyst: {
            select: { id: true, nama: true, username: true },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          penggunaId: userId,
          modul: 'pengujian',
          aksi: `HASIL_UJI_UPDATED: ID #${id} (${updated.kodeUji})`,
        },
      });

      return updated;
    });
  }

  /**
   * Menghapus hasil uji dan rollback status bila diperlukan
   */
  static async deleteTestResult(id: number, userId: number) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.testResult.findUnique({
        where: { id },
        include: { sample: true },
      });

      if (!existing) return null;

      const deleted = await tx.testResult.delete({
        where: { id },
      });

      // Cek apakah sampel ini masih punya hasil uji lain
      const remainingTests = await tx.testResult.count({
        where: { sampelId: existing.sampelId },
      });

      if (remainingTests === 0) {
        // Kembalikan status sampel ke 'diuji'
        await tx.sample.update({
          where: { id: existing.sampelId },
          data: { status: 'diuji' },
        });

        // Revert penerimaan batch ke diproses
        if (existing.sample?.penerimaanId) {
          await tx.sampleReceipt.update({
            where: { id: existing.sample.penerimaanId },
            data: { status: 'diproses' },
          });
        }
      }

      await tx.activityLog.create({
        data: {
          penggunaId: userId,
          modul: 'pengujian',
          aksi: `HASIL_UJI_DELETED: ID #${id} (${existing.kodeUji})`,
        },
      });

      return deleted;
    });
  }
}
