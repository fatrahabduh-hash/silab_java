import { prisma } from '../../config/database.js';
import { Prisma, InvoiceStatus } from '@prisma/client';
import { InvoiceFilterQuery } from './invoice.types.js';

export class InvoiceRepository {
  async findById(id: number) {
    return prisma.invoice.findUnique({
      where: { id },
      include: {
        receipt: {
          select: {
            id: true,
            nomorPenerimaan: true,
            tanggalTerima: true,
            klien: true,
            jumlahSampel: true,
          },
        },
        creator: {
          select: {
            id: true,
            nama: true,
            username: true,
          },
        },
        items: {
          include: {
            sample: {
              select: {
                id: true,
                kodeSampel: true,
                jenisMaterial: true,
              },
            },
            tariff: {
              select: {
                id: true,
                nama: true,
                parameter: true,
                metode: true,
              },
            },
          },
        },
      },
    });
  }

  async findByNomor(nomorInvoice: string) {
    return prisma.invoice.findUnique({
      where: { nomorInvoice },
    });
  }

  async findLastNomorForMonth(prefix: string) {
    const last = await prisma.invoice.findFirst({
      where: {
        nomorInvoice: {
          startsWith: prefix,
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
    return last?.nomorInvoice || null;
  }

  async create(invoiceData: Prisma.InvoiceUncheckedCreateInput, items: Prisma.InvoiceItemUncheckedCreateWithoutInvoiceInput[]) {
    return prisma.invoice.create({
      data: {
        ...invoiceData,
        items: {
          create: items,
        },
      },
      include: {
        items: true,
        receipt: true,
      },
    });
  }

  async update(id: number, invoiceData: Prisma.InvoiceUpdateInput, items?: Prisma.InvoiceItemUncheckedCreateWithoutInvoiceInput[]) {
    return prisma.$transaction(async (tx) => {
      if (items && items.length > 0) {
        // Hapus item lama, ganti dengan item baru
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: id },
        });

        await tx.invoiceItem.createMany({
          data: items.map((it) => ({
            ...it,
            invoiceId: id,
          })),
        });
      }

      return tx.invoice.update({
        where: { id },
        data: invoiceData,
        include: {
          items: true,
        },
      });
    });
  }

  async updateStatus(id: number, status: InvoiceStatus, catatan?: string) {
    const data: Prisma.InvoiceUpdateInput = { status };
    if (catatan) {
      data.catatan = catatan;
    }
    return prisma.invoice.update({
      where: { id },
      data,
      include: {
        items: true,
      },
    });
  }

  async delete(id: number) {
    return prisma.invoice.delete({
      where: { id },
    });
  }

  private buildWhereClause(query: InvoiceFilterQuery): Prisma.InvoiceWhereInput {
    const where: Prisma.InvoiceWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.klien) {
      where.klien = { contains: query.klien };
    }

    if (query.search) {
      const s = query.search;
      where.OR = [
        { nomorInvoice: { contains: s } },
        { klien: { contains: s } },
        { catatan: { contains: s } },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      where.tanggalInvoice = {};
      if (query.dateFrom) {
        where.tanggalInvoice.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.tanggalInvoice.lte = new Date(query.dateTo);
      }
    }

    return where;
  }

  async findMany(query: InvoiceFilterQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query);

    return prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: 'desc' },
      include: {
        items: true,
        receipt: {
          select: {
            nomorPenerimaan: true,
          },
        },
      },
    });
  }

  async count(query: InvoiceFilterQuery) {
    const where = this.buildWhereClause(query);
    return prisma.invoice.count({ where });
  }

  async getStats() {
    const allInvoices = await prisma.invoice.findMany({
      select: {
        total: true,
        status: true,
      },
    });

    let totalNominal = 0;
    let totalLunasNominal = 0;
    let totalPiutangNominal = 0;

    const statusCount = {
      draft: 0,
      diterbitkan: 0,
      lunas: 0,
      dibatalkan: 0,
    };

    for (const inv of allInvoices) {
      const val = Number(inv.total ?? 0);
      const st = inv.status || 'draft';

      if (st !== 'dibatalkan') {
        totalNominal += val;
      }

      if (st === 'lunas') {
        totalLunasNominal += val;
      } else if (st === 'diterbitkan') {
        totalPiutangNominal += val;
      }

      if (st in statusCount) {
        statusCount[st]++;
      }
    }

    return {
      totalInvoice: allInvoices.length,
      totalNominal,
      totalLunasNominal,
      totalPiutangNominal,
      statusCount,
    };
  }
}
