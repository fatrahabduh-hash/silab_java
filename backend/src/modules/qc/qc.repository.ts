import { prisma } from '../../config/database.js';
import {
  CreateQcInput,
  CreateStandardSampleInput,
  ReviewQcInput,
  QcQueryFilter,
  QcStatistics,
  QcType,
  QcFlag,
} from './qc.types.js';
import { Prisma } from '@prisma/client';

export class QcRepository {
  /**
   * Menghitung recovery % dan mengevaluasi status bendera mutu analitis
   */
  static evaluateRecoveryAndFlag(
    nilaiQc?: number | null,
    nilaiExpected?: number | null,
    batasMinPct: number = 85.0,
    batasMaksPct: number = 115.0,
    tipeQc: QcType = 'standar'
  ): { persenRecovery: number | null; flag: QcFlag } {
    if (
      nilaiExpected !== null &&
      nilaiExpected !== undefined &&
      nilaiExpected > 0 &&
      nilaiQc !== null &&
      nilaiQc !== undefined
    ) {
      const rec = Number(((nilaiQc / nilaiExpected) * 100).toFixed(4));
      let flag: QcFlag = 'pass';

      if (rec < batasMinPct || rec > batasMaksPct) {
        flag = 'fail';
      } else if (rec < batasMinPct + 5 || rec > batasMaksPct - 5) {
        flag = 'warning';
      }

      return { persenRecovery: rec, flag };
    }

    if (tipeQc === 'blanko' && nilaiQc !== null && nilaiQc !== undefined) {
      // Kontaminasi blanko di atas 0.05 memicu bendera fail
      const flag: QcFlag = Math.abs(nilaiQc) <= 0.05 ? 'pass' : 'fail';
      return { persenRecovery: null, flag };
    }

    return { persenRecovery: null, flag: 'pass' };
  }

  /**
   * Transaksi pencatatan hasil pengujian QC baru
   */
  static async createQc(input: CreateQcInput, userId: number) {
    const bMin = input.batasMinPct !== undefined ? input.batasMinPct : 85.0;
    const bMaks = input.batasMaksPct !== undefined ? input.batasMaksPct : 115.0;

    const { persenRecovery, flag } = this.evaluateRecoveryAndFlag(
      input.nilaiQc,
      input.nilaiExpected,
      bMin,
      bMaks,
      input.tipeQc
    );

    const tglUji = input.tanggalUji ? new Date(input.tanggalUji) : new Date();

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.qcSample.create({
        data: {
          preparasiId: input.preparasiId || null,
          sampelId: input.sampelId,
          tipeQc: input.tipeQc,
          parameter: input.parameter || null,
          nilaiQc: input.nilaiQc !== undefined && input.nilaiQc !== null ? new Prisma.Decimal(input.nilaiQc) : null,
          nilaiExpected: input.nilaiExpected || null,
          satuan: input.satuan || '%',
          persenRecovery: persenRecovery !== null ? new Prisma.Decimal(persenRecovery) : null,
          batasMinPct: new Prisma.Decimal(bMin),
          batasMaksPct: new Prisma.Decimal(bMaks),
          flag,
          statusQc: 'pending',
          tanggalUji: tglUji,
        },
        include: {
          sample: {
            select: {
              id: true,
              kodeSampel: true,
              jenisMaterial: true,
              klien: true,
            },
          },
          preparation: true,
          reviewer: {
            select: { id: true, nama: true, username: true },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          penggunaId: userId,
          modul: 'qc',
          aksi: `QC_RECORDED: Tipe ${input.tipeQc} (Parameter: ${input.parameter || '-'}, Nilai: ${input.nilaiQc ?? '-'}, Flag: ${flag})`,
        },
      });

      return created;
    });
  }

  /**
   * Pendaftaran acuan Certified Reference Material (CRM) / Standar QC
   */
  static async createStandardSample(input: CreateStandardSampleInput, userId: number) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Cari sampel berdasarkan id atau kode_sampel
      const sampleIdNum = parseInt(input.sampelKey, 10);
      let sample = await tx.sample.findFirst({
        where: {
          OR: [
            ...(isNaN(sampleIdNum) ? [] : [{ id: sampleIdNum }]),
            { kodeSampel: input.sampelKey },
          ],
        },
      });

      if (!sample) {
        sample = await tx.sample.create({
          data: {
            kodeSampel: input.sampelKey,
            tanggalMasuk: new Date(),
            jenisMaterial: 'Standar CRM / Referensi',
            status: 'antrian',
            dibuatOleh: userId,
          },
        });
      }

      const existing = await tx.qcSample.findFirst({
        where: {
          sampelId: sample.id,
          tipeQc: 'standar',
          nilaiQc: null,
        },
      });

      let qcRecord;
      if (existing) {
        qcRecord = await tx.qcSample.update({
          where: { id: existing.id },
          data: {
            parameter: input.parameter,
            nilaiExpected: Math.round(input.nilaiSertifikat),
          },
          include: { sample: true },
        });
      } else {
        qcRecord = await tx.qcSample.create({
          data: {
            sampelId: sample.id,
            tipeQc: 'standar',
            parameter: input.parameter,
            nilaiExpected: Math.round(input.nilaiSertifikat),
            batasMinPct: new Prisma.Decimal(85.0),
            batasMaksPct: new Prisma.Decimal(115.0),
            flag: 'pass',
            statusQc: 'pending',
            tanggalUji: new Date(),
          },
          include: { sample: true },
        });
      }

      await tx.activityLog.create({
        data: {
          penggunaId: userId,
          modul: 'qc',
          aksi: `QC_STANDARD_REGISTERED: Sampel ${sample.kodeSampel} (Nilai Acuan: ${input.nilaiSertifikat})`,
        },
      });

      return qcRecord;
    });
  }

  /**
   * Alur review dan pengesahan mutu oleh Supervisor / Admin
   */
  static async reviewQc(id: number, input: ReviewQcInput, reviewerId: number) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.qcSample.update({
        where: { id },
        data: {
          statusQc: input.keputusan,
          reviewerId,
          catatanReview: input.catatanReview || null,
        },
        include: {
          sample: true,
          preparation: true,
          reviewer: {
            select: { id: true, nama: true, username: true, role: true },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          penggunaId: reviewerId,
          modul: 'qc',
          aksi: `QC_REVIEWED: ID #${id} (${input.keputusan.toUpperCase()})`,
        },
      });

      return updated;
    });
  }

  /**
   * Mengambil daftar riwayat QC dengan filter dan pagination
   */
  static async findQcRecords(query: QcQueryFilter, clientFilter?: string) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.QcSampleWhereInput = {};

    if (query.sampelId) where.sampelId = query.sampelId;
    if (query.tipeQc) where.tipeQc = query.tipeQc;
    if (query.flag) where.flag = query.flag;
    if (query.statusQc) where.statusQc = query.statusQc;
    if (query.parameter) where.parameter = { contains: query.parameter };

    if (query.dateFrom || query.dateTo) {
      where.tanggalUji = {};
      if (query.dateFrom) where.tanggalUji.gte = new Date(query.dateFrom);
      if (query.dateTo) where.tanggalUji.lte = new Date(query.dateTo);
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { parameter: { contains: s } },
        { sample: { kodeSampel: { contains: s } } },
        { sample: { klien: { contains: s } } },
        { catatanReview: { contains: s } },
      ];
    }

    if (clientFilter) {
      where.sample = {
        klien: clientFilter,
      };
    }

    const [total, items] = await Promise.all([
      prisma.qcSample.count({ where }),
      prisma.qcSample.findMany({
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
            },
          },
          preparation: {
            select: {
              id: true,
              metodePreparasi: true,
              faktorPengenceran: true,
            },
          },
          reviewer: {
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
   * Mengambil detail catatan QC berdasarkan ID
   */
  static async findQcById(id: number) {
    return prisma.qcSample.findUnique({
      where: { id },
      include: {
        sample: {
          include: { receipt: true },
        },
        preparation: true,
        reviewer: {
          select: { id: true, nama: true, username: true, role: true },
        },
      },
    });
  }

  /**
   * Mengambil statistik ringkasan QC untuk dasbor laboratorium
   */
  static async getQcStatistics(clientFilter?: string): Promise<QcStatistics> {
    const where: Prisma.QcSampleWhereInput = {};
    if (clientFilter) {
      where.sample = { klien: clientFilter };
    }

    const [
      total,
      pass,
      warning,
      fail,
      pending,
      disetujui,
      ditolak,
      blanko,
      standar,
      spike,
      duplikat,
    ] = await Promise.all([
      prisma.qcSample.count({ where }),
      prisma.qcSample.count({ where: { ...where, flag: 'pass' } }),
      prisma.qcSample.count({ where: { ...where, flag: 'warning' } }),
      prisma.qcSample.count({ where: { ...where, flag: 'fail' } }),
      prisma.qcSample.count({ where: { ...where, statusQc: 'pending' } }),
      prisma.qcSample.count({ where: { ...where, statusQc: 'disetujui' } }),
      prisma.qcSample.count({ where: { ...where, statusQc: 'ditolak' } }),
      prisma.qcSample.count({ where: { ...where, tipeQc: 'blanko' } }),
      prisma.qcSample.count({ where: { ...where, tipeQc: 'standar' } }),
      prisma.qcSample.count({ where: { ...where, tipeQc: 'spike' } }),
      prisma.qcSample.count({ where: { ...where, tipeQc: 'duplikat' } }),
    ]);

    return {
      total,
      pass,
      warning,
      fail,
      pending,
      disetujui,
      ditolak,
      byType: {
        blanko,
        standar,
        spike,
        duplikat,
      },
    };
  }

  /**
   * Menghapus catatan QC
   */
  static async deleteQc(id: number, userId: number) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const deleted = await tx.qcSample.delete({
        where: { id },
      });

      await tx.activityLog.create({
        data: {
          penggunaId: userId,
          modul: 'qc',
          aksi: `QC_DELETED: ID #${id}`,
        },
      });

      return deleted;
    });
  }
}
