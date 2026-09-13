import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { EquipmentFilterQuery } from './equipment.types.js';

export class EquipmentRepository {
  async findById(id: number) {
    return prisma.equipment.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            workOrders: true,
            testResults: true,
          },
        },
      },
    });
  }

  async findByKode(kodeAlat: string) {
    return prisma.equipment.findUnique({
      where: { kodeAlat },
    });
  }

  async create(data: Prisma.EquipmentCreateInput) {
    return prisma.equipment.create({
      data,
    });
  }

  async update(id: number, data: Prisma.EquipmentUpdateInput) {
    return prisma.equipment.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.equipment.delete({
      where: { id },
    });
  }

  private buildWhereClause(query: EquipmentFilterQuery): Prisma.EquipmentWhereInput {
    const where: Prisma.EquipmentWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.lokasi) {
      where.lokasi = { contains: query.lokasi };
    }

    if (query.search) {
      const s = query.search;
      where.OR = [
        { kodeAlat: { contains: s } },
        { nama: { contains: s } },
        { pic: { contains: s } },
        { lokasi: { contains: s } },
      ];
    }

    if (query.kalibrasiStatus) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const in30Days = new Date(today);
      in30Days.setDate(in30Days.getDate() + 30);

      if (query.kalibrasiStatus === 'kadaluarsa') {
        where.masaBerlakuKalibrasi = {
          lt: today,
        };
      } else if (query.kalibrasiStatus === 'segera') {
        where.masaBerlakuKalibrasi = {
          gte: today,
          lte: in30Days,
        };
      } else if (query.kalibrasiStatus === 'valid') {
        where.masaBerlakuKalibrasi = {
          gt: in30Days,
        };
      }
    }

    return where;
  }

  async findMany(query: EquipmentFilterQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query);

    return prisma.equipment.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ status: 'asc' }, { nama: 'asc' }],
    });
  }

  async count(query: EquipmentFilterQuery) {
    const where = this.buildWhereClause(query);
    return prisma.equipment.count({ where });
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const [
      total,
      tersedia,
      digunakan,
      maintenance,
      rusak,
      kalibrasiKadaluarsa,
      kalibrasiSegera,
    ] = await Promise.all([
      prisma.equipment.count(),
      prisma.equipment.count({ where: { status: 'tersedia' } }),
      prisma.equipment.count({ where: { status: 'digunakan' } }),
      prisma.equipment.count({ where: { status: 'maintenance' } }),
      prisma.equipment.count({ where: { status: 'rusak' } }),
      prisma.equipment.count({
        where: {
          masaBerlakuKalibrasi: {
            lt: today,
          },
        },
      }),
      prisma.equipment.count({
        where: {
          masaBerlakuKalibrasi: {
            gte: today,
            lte: in30Days,
          },
        },
      }),
    ]);

    return {
      total,
      tersedia,
      digunakan,
      maintenance,
      rusak,
      kalibrasiKadaluarsa,
      kalibrasiSegera,
    };
  }

  async checkActiveReferences(id: number) {
    const [woCount, testCount] = await Promise.all([
      prisma.workOrder.count({ where: { peralatanId: id } }),
      prisma.testResult.count({ where: { alatId: id } }),
    ]);
    return { woCount, testCount };
  }
}
