import { prisma } from '../../config/database.js';
import { Sample, SampleReceipt, SampleStatus, ReceiptStatus, Prisma } from '@prisma/client';
import {
  CreateReceiptInput,
  CreateSampleInput,
  SampleQueryParams,
  ReceiptQueryParams,
  PaginatedResult,
} from './sample.types.js';

export class SampleRepository {
  /**
   * Catat audit log aktivitas sampel ke tabel log_aktivitas
   */
  static async logActivity(params: {
    userId?: number | null;
    action: string;
    sampleId?: number;
    receiptId?: number;
  }): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          penggunaId: params.userId || null,
          aksi: params.action.substring(0, 200),
          modul: 'sampel',
        },
      });
    } catch (error) {
      console.error('[SampleRepository.logActivity Error]:', error);
    }
  }

  /**
   * Cari batch penerimaan sampel berdasarkan Nomor Penerimaan
   */
  static async findReceiptByNomor(nomor: string): Promise<SampleReceipt | null> {
    return prisma.sampleReceipt.findUnique({
      where: { nomorPenerimaan: nomor },
    });
  }

  /**
   * Cari batch penerimaan sampel berdasarkan ID beserta daftar sampelnya
   */
  static async findReceiptById(id: number) {
    return prisma.sampleReceipt.findUnique({
      where: { id },
      include: {
        samples: {
          orderBy: { id: 'asc' },
        },
        creator: {
          select: { id: true, nama: true, username: true, role: true },
        },
      },
    });
  }

  /**
   * Ambil daftar penerimaan sampel dengan pagination & search
   */
  static async findAllReceipts(params: ReceiptQueryParams): Promise<PaginatedResult<any>> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.SampleReceiptWhereInput = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.klien) {
      where.klien = { contains: params.klien };
    }

    if (params.search) {
      where.OR = [
        { nomorPenerimaan: { contains: params.search } },
        { klien: { contains: params.search } },
        { jenisMaterial: { contains: params.search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.sampleReceipt.count({ where }),
      prisma.sampleReceipt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          _count: {
            select: { samples: true },
          },
          creator: {
            select: { id: true, nama: true, username: true },
          },
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Buat penerimaan batch baru (opsional menyertakan sampel sekaligus secara atomik)
   */
  static async createReceipt(
    data: CreateReceiptInput & { nomorPenerimaan: string; tanggalTerima: Date },
    userId?: number
  ): Promise<SampleReceipt> {
    const sampleList = data.samples || [];
    const jumlah = data.jumlahSampel ?? sampleList.length;

    return prisma.$transaction(async (tx) => {
      const receipt = await tx.sampleReceipt.create({
        data: {
          nomorPenerimaan: data.nomorPenerimaan,
          klien: data.klien,
          tanggalTerima: data.tanggalTerima,
          jumlahSampel: jumlah,
          jenisMaterial: data.jenisMaterial || (sampleList[0]?.jenisMaterial ?? null),
          metodeUji: data.metodeUji || (sampleList[0]?.metodeUji ?? null),
          keterangan: data.keterangan || null,
          status: 'diterima',
          isConfirmed: false,
          dibuatOleh: userId || null,
        },
      });

      if (sampleList.length > 0) {
        for (let i = 0; i < sampleList.length; i++) {
          const s = sampleList[i];
          const sampleIndex = String(i + 1).padStart(3, '0');
          const autoCode = s.kodeSampel || `${data.nomorPenerimaan.replace('REC-', 'S-')}-${sampleIndex}`;

          await tx.sample.create({
            data: {
              penerimaanId: receipt.id,
              kodeSampel: autoCode,
              tanggalMasuk: data.tanggalTerima,
              jenisMaterial: s.jenisMaterial || data.jenisMaterial || 'Umum',
              beratGram: s.beratGram ? new Prisma.Decimal(s.beratGram) : null,
              klien: s.klien || data.klien,
              metodeUji: s.metodeUji || data.metodeUji || null,
              keterangan: s.keterangan || null,
              status: 'antrian',
              dibuatOleh: userId || null,
            },
          });
        }
      }

      return receipt;
    });
  }

  /**
   * Update status / konfirmasi penerimaan batch
   */
  static async updateReceipt(
    id: number,
    data: { status?: ReceiptStatus; isConfirmed?: boolean }
  ): Promise<SampleReceipt> {
    return prisma.sampleReceipt.update({
      where: { id },
      data,
    });
  }

  /**
   * Cari sampel berdasarkan ID
   */
  static async findSampleById(id: number) {
    return prisma.sample.findUnique({
      where: { id },
      include: {
        receipt: {
          select: {
            id: true,
            nomorPenerimaan: true,
            tanggalTerima: true,
            status: true,
            isConfirmed: true,
          },
        },
        creator: {
          select: { id: true, nama: true, username: true, role: true },
        },
      },
    });
  }

  /**
   * Cari sampel berdasarkan kode unik
   */
  static async findSampleByKode(kodeSampel: string): Promise<Sample | null> {
    return prisma.sample.findUnique({
      where: { kodeSampel },
    });
  }

  /**
   * Buat sampel satuan baru
   */
  static async createSample(
    data: CreateSampleInput & { kodeSampel: string; tanggalMasuk: Date },
    userId?: number
  ): Promise<Sample> {
    return prisma.sample.create({
      data: {
        penerimaanId: data.penerimaanId || null,
        kodeSampel: data.kodeSampel,
        tanggalMasuk: data.tanggalMasuk,
        jenisMaterial: data.jenisMaterial,
        beratGram: data.beratGram ? new Prisma.Decimal(data.beratGram) : null,
        klien: data.klien || null,
        metodeUji: data.metodeUji || null,
        keterangan: data.keterangan || null,
        status: 'antrian',
        dibuatOleh: userId || null,
      },
    });
  }

  /**
   * Update status sampel
   */
  static async updateSampleStatus(id: number, status: SampleStatus): Promise<Sample> {
    return prisma.sample.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Ambil daftar sampel dengan filter, pagination, dan opsi pembatasan per klien
   */
  static async findAllSamples(
    params: SampleQueryParams,
    clientRestriction?: string
  ): Promise<PaginatedResult<any>> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.SampleWhereInput = {};

    // Jika user dibatasi (misal role klien), kunci filter klien
    if (clientRestriction) {
      where.klien = { contains: clientRestriction };
    } else if (params.klien) {
      where.klien = { contains: params.klien };
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.metodeUji) {
      where.metodeUji = { contains: params.metodeUji };
    }

    if (params.penerimaanId) {
      where.penerimaanId = Number(params.penerimaanId);
    }

    if (params.search) {
      where.OR = [
        { kodeSampel: { contains: params.search } },
        { jenisMaterial: { contains: params.search } },
        { klien: { contains: params.search } },
        { metodeUji: { contains: params.search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.sample.count({ where }),
      prisma.sample.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          receipt: {
            select: {
              id: true,
              nomorPenerimaan: true,
              tanggalTerima: true,
              status: true,
            },
          },
          creator: {
            select: { id: true, nama: true, username: true },
          },
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Hitung total sampel hari ini untuk penomoran urut
   */
  static async countReceiptsToday(datePrefix: string): Promise<number> {
    return prisma.sampleReceipt.count({
      where: {
        nomorPenerimaan: {
          startsWith: datePrefix,
        },
      },
    });
  }

  /**
   * Hitung total sampel hari ini untuk kode urut
   */
  static async countSamplesToday(datePrefix: string): Promise<number> {
    return prisma.sample.count({
      where: {
        kodeSampel: {
          startsWith: datePrefix,
        },
      },
    });
  }
}
