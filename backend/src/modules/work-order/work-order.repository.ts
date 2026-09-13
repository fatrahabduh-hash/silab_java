import { prisma } from '../../config/database.js';
import { WorkOrder, Prisma } from '@prisma/client';
import {
  CreateWorkOrderInput,
  WorkOrderQueryFilter,
} from './work-order.types.js';

export class WorkOrderRepository {
  /**
   * Generator format nomor urut: WO-YYMM-XXX (Contoh: WO-2609-001)
   */
  static async generateWorkOrderNumber(): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `WO-${yy}${mm}-`;

    const count = await prisma.workOrder.count({
      where: {
        nomorWo: { startsWith: prefix },
      },
    });

    let nextNum = count + 1;
    let code = `${prefix}${String(nextNum).padStart(3, '0')}`;

    while (await prisma.workOrder.findUnique({ where: { nomorWo: code } })) {
      nextNum++;
      code = `${prefix}${String(nextNum).padStart(3, '0')}`;
    }

    return code;
  }

  /**
   * Cari Work Order berdasarkan nomor unik
   */
  static async findWorkOrderByNomor(nomorWo: string): Promise<WorkOrder | null> {
    return prisma.workOrder.findUnique({
      where: { nomorWo },
    });
  }

  /**
   * Cari Work Order berdasarkan ID dengan relasi lengkap
   */
  static async findWorkOrderById(id: number) {
    return prisma.workOrder.findUnique({
      where: { id },
      include: {
        assignedAnalyst: {
          select: { id: true, nama: true, username: true, role: true },
        },
        equipment: true,
        creator: {
          select: { id: true, nama: true, username: true },
        },
        receipt: {
          select: { id: true, nomorPenerimaan: true, klien: true, tanggalTerima: true },
        },
        workOrderSamples: {
          include: {
            sample: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });
  }

  /**
   * Ambil sampel dalam batch yang memenuhi syarat untuk dimasukkan ke WO
   */
  static async findEligibleSamplesForBatch(penerimaanId: number): Promise<number[]> {
    const samples = await prisma.sample.findMany({
      where: {
        penerimaanId,
        status: { in: ['antrian', 'diuji'] },
        workOrderSamples: {
          none: {
            workOrder: {
              status: { in: ['draft', 'aktif'] },
            },
          },
        },
      },
      select: { id: true },
    });

    return samples.map((s) => s.id);
  }

  /**
   * Ambil daftar sampel yang belum memiliki WO aktif atau draft
   */
  static async findAvailableSamples() {
    return prisma.sample.findMany({
      where: {
        status: { in: ['antrian', 'diuji'] },
        workOrderSamples: {
          none: {
            workOrder: {
              status: { in: ['draft', 'aktif'] },
            },
          },
        },
      },
      include: {
        receipt: {
          select: { id: true, nomorPenerimaan: true, klien: true },
        },
      },
      orderBy: { id: 'desc' },
      take: 100,
    });
  }

  /**
   * Buat Work Order baru bersamaan pengikatan pivot sampel secara atomik
   */
  static async createWorkOrder(
    data: CreateWorkOrderInput & { nomorWo: string },
    sampleIds: number[],
    userId?: number
  ) {
    const isBatch = data.mode === 'batch';
    const statusWo = data.statusAwal || 'draft';

    return prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.create({
        data: {
          nomorWo: data.nomorWo,
          penerimaanId: data.penerimaanId || null,
          lingkupBatch: isBatch,
          analisId: data.analisId || null,
          peralatanId: data.peralatanId || null,
          parameter: data.parameter || null,
          metode: data.metode || null,
          prioritas: data.prioritas || 'normal',
          jadwalMulai: data.jadwalMulai ? new Date(data.jadwalMulai) : null,
          jadwalSelesai: data.jadwalSelesai ? new Date(data.jadwalSelesai) : null,
          catatan: data.catatan || null,
          status: statusWo,
          dibuatOleh: userId || null,
        },
      });

      // Tautkan sampel ke tabel pivot
      if (sampleIds.length > 0) {
        await tx.workOrderSample.createMany({
          data: sampleIds.map((sid) => ({
            woId: wo.id,
            sampelId: sid,
          })),
        });

        // Jika WO langsung berstatus 'aktif', update status sampel ke 'diuji'
        if (statusWo === 'aktif') {
          await tx.sample.updateMany({
            where: { id: { in: sampleIds } },
            data: { status: 'diuji' },
          });
        }
      }

      return wo;
    });
  }

  /**
   * Perbarui status Work Order secara atomik dan sinkronkan status sampel
   */
  static async updateStatus(
    id: number,
    newStatus: 'aktif' | 'selesai' | 'dibatalkan',
    catatan?: string
  ) {
    return prisma.$transaction(async (tx) => {
      // Ambil ID seluruh sampel yang terikat pada WO ini
      const pivotItems = await tx.workOrderSample.findMany({
        where: { woId: id },
        select: { sampelId: true },
      });
      const sampleIds = pivotItems.map((p) => p.sampelId);

      // Data update WO
      const updateData: Prisma.WorkOrderUpdateInput = {
        status: newStatus,
        ...(catatan ? { catatan } : {}),
      };

      if (newStatus === 'selesai') {
        updateData.selesaiAt = new Date();
      }

      const updatedWo = await tx.workOrder.update({
        where: { id },
        data: updateData,
      });

      // Sinkronisasi status sampel
      if (sampleIds.length > 0) {
        if (newStatus === 'aktif') {
          await tx.sample.updateMany({
            where: { id: { in: sampleIds } },
            data: { status: 'diuji' },
          });
        } else if (newStatus === 'selesai') {
          await tx.sample.updateMany({
            where: { id: { in: sampleIds } },
            data: { status: 'selesai' },
          });
        } else if (newStatus === 'dibatalkan') {
          await tx.sample.updateMany({
            where: { id: { in: sampleIds } },
            data: { status: 'antrian' },
          });
        }
      }

      return updatedWo;
    });
  }

  /**
   * Ambil daftar Work Order dengan filter, search, dan pagination
   */
  static async findAllWorkOrders(
    filter: WorkOrderQueryFilter,
    analystRestrictionId?: number
  ) {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.WorkOrderWhereInput = {};

    if (analystRestrictionId) {
      where.analisId = analystRestrictionId;
    } else if (filter.analisId) {
      where.analisId = Number(filter.analisId);
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.prioritas) {
      where.prioritas = filter.prioritas;
    }

    if (filter.penerimaanId) {
      where.penerimaanId = Number(filter.penerimaanId);
    }

    if (filter.search) {
      where.OR = [
        { nomorWo: { contains: filter.search } },
        { parameter: { contains: filter.search } },
        { metode: { contains: filter.search } },
        { receipt: { nomorPenerimaan: { contains: filter.search } } },
        { receipt: { klien: { contains: filter.search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.workOrder.count({ where }),
      prisma.workOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          assignedAnalyst: {
            select: { id: true, nama: true, username: true },
          },
          equipment: {
            select: { id: true, kodeAlat: true, nama: true },
          },
          receipt: {
            select: { id: true, nomorPenerimaan: true, klien: true },
          },
          _count: {
            select: { workOrderSamples: true },
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
}
