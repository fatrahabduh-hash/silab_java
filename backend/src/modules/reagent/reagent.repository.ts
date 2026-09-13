import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { ReagentFilterQuery } from './reagent.types.js';

export class ReagentRepository {
  async findById(id: number) {
    return prisma.chemicalReagent.findUnique({
      where: { id },
    });
  }

  async findByKode(kodeBahan: string) {
    return prisma.chemicalReagent.findUnique({
      where: { kodeBahan },
    });
  }

  async create(data: Prisma.ChemicalReagentCreateInput) {
    return prisma.chemicalReagent.create({
      data,
    });
  }

  async update(id: number, data: Prisma.ChemicalReagentUpdateInput) {
    return prisma.chemicalReagent.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.chemicalReagent.delete({
      where: { id },
    });
  }

  private buildWhereClause(query: ReagentFilterQuery): Prisma.ChemicalReagentWhereInput {
    const where: Prisma.ChemicalReagentWhereInput = {};

    if (query.search) {
      const s = query.search;
      where.OR = [
        { kodeBahan: { contains: s } },
        { nama: { contains: s } },
        { supplier: { contains: s } },
      ];
    }

    if (query.statusKadaluarsa) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const in30Days = new Date(today);
      in30Days.setDate(in30Days.getDate() + 30);

      if (query.statusKadaluarsa === 'kadaluarsa') {
        where.tanggalKadaluarsa = {
          lt: today,
        };
      } else if (query.statusKadaluarsa === 'segera') {
        where.tanggalKadaluarsa = {
          gte: today,
          lte: in30Days,
        };
      } else if (query.statusKadaluarsa === 'aman') {
        where.OR = [
          { tanggalKadaluarsa: { gt: in30Days } },
          { tanggalKadaluarsa: null },
        ];
      }
    }

    return where;
  }

  async findMany(query: ReagentFilterQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query);

    return prisma.chemicalReagent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { nama: 'asc' },
    });
  }

  async count(query: ReagentFilterQuery) {
    const where = this.buildWhereClause(query);
    return prisma.chemicalReagent.count({ where });
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const allReagents = await prisma.chemicalReagent.findMany();

    let stokKritis = 0;
    let stokAman = 0;
    let kadaluarsa = 0;
    let kadaluarsaSegera = 0;

    for (const r of allReagents) {
      const stok = Number(r.stok);
      const min = Number(r.stokMinimum ?? 0);
      if (stok <= min) {
        stokKritis++;
      } else {
        stokAman++;
      }

      if (r.tanggalKadaluarsa) {
        const exp = new Date(r.tanggalKadaluarsa);
        if (exp < today) {
          kadaluarsa++;
        } else if (exp <= in30Days) {
          kadaluarsaSegera++;
        }
      }
    }

    return {
      totalItem: allReagents.length,
      stokKritis,
      stokAman,
      kadaluarsa,
      kadaluarsaSegera,
    };
  }
}
