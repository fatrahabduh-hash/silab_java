import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { TariffFilterQuery } from './tariff.types.js';

export class TariffRepository {
  async findById(id: number) {
    return prisma.testTariff.findUnique({
      where: { id },
      include: {
        _count: {
          select: { invoiceItems: true },
        },
      },
    });
  }

  async create(data: Prisma.TestTariffCreateInput) {
    return prisma.testTariff.create({
      data,
    });
  }

  async update(id: number, data: Prisma.TestTariffUpdateInput) {
    return prisma.testTariff.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.testTariff.delete({
      where: { id },
    });
  }

  private buildWhereClause(query: TariffFilterQuery): Prisma.TestTariffWhereInput {
    const where: Prisma.TestTariffWhereInput = {};

    if (query.aktif !== undefined) {
      where.aktif = query.aktif;
    }

    if (query.parameter) {
      where.parameter = { contains: query.parameter };
    }

    if (query.metode) {
      where.metode = { contains: query.metode };
    }

    if (query.search) {
      const s = query.search;
      where.OR = [
        { nama: { contains: s } },
        { parameter: { contains: s } },
        { metode: { contains: s } },
      ];
    }

    return where;
  }

  async findMany(query: TariffFilterQuery) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query);

    return prisma.testTariff.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ aktif: 'desc' }, { nama: 'asc' }],
    });
  }

  async count(query: TariffFilterQuery) {
    const where = this.buildWhereClause(query);
    return prisma.testTariff.count({ where });
  }
}
