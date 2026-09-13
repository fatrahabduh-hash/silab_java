import { prisma } from '../../config/database.js';
import { Prisma, SubmissionStatus } from '@prisma/client';
import { SubmissionFilterQuery } from './submission.types.js';

export class SubmissionRepository {
  async findById(id: number) {
    return prisma.sampleSubmission.findUnique({
      where: { id },
      include: {
        details: true,
        clientAccesses: {
          select: {
            id: true,
            kodeAkses: true,
            status: true,
            penerimaanId: true,
          },
        },
      },
    });
  }

  async findByNomor(nomorSubmission: string) {
    return prisma.sampleSubmission.findUnique({
      where: { nomorSubmission },
      include: {
        details: true,
        clientAccesses: true,
      },
    });
  }

  async findLastNomorForMonth(prefix: string) {
    const last = await prisma.sampleSubmission.findFirst({
      where: {
        nomorSubmission: {
          startsWith: prefix,
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
    return last?.nomorSubmission || null;
  }

  async create(
    submissionData: Prisma.SampleSubmissionUncheckedCreateInput,
    details: Prisma.SampleSubmissionDetailUncheckedCreateWithoutSubmissionInput[]
  ) {
    return prisma.sampleSubmission.create({
      data: {
        ...submissionData,
        details: {
          create: details,
        },
      },
      include: {
        details: true,
      },
    });
  }

  async updateStatus(id: number, status: SubmissionStatus, catatan?: string) {
    const data: Prisma.SampleSubmissionUpdateInput = { status };
    if (catatan) {
      data.catatan = catatan;
    }
    return prisma.sampleSubmission.update({
      where: { id },
      data,
      include: {
        details: true,
      },
    });
  }

  async delete(id: number) {
    return prisma.sampleSubmission.delete({
      where: { id },
    });
  }

  private buildWhereClause(query: SubmissionFilterQuery): Prisma.SampleSubmissionWhereInput {
    const where: Prisma.SampleSubmissionWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.klien) {
      where.klien = { contains: query.klien };
    }

    if (query.search) {
      const s = query.search;
      where.OR = [
        { nomorSubmission: { contains: s } },
        { klien: { contains: s } },
        { kontakPerson: { contains: s } },
        { email: { contains: s } },
        { poReferensi: { contains: s } },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      where.tanggalSubmit = {};
      if (query.dateFrom) {
        where.tanggalSubmit.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.tanggalSubmit.lte = new Date(query.dateTo);
      }
    }

    return where;
  }

  async findMany(query: SubmissionFilterQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query);

    return prisma.sampleSubmission.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: 'desc' },
      include: {
        details: true,
      },
    });
  }

  async count(query: SubmissionFilterQuery) {
    const where = this.buildWhereClause(query);
    return prisma.sampleSubmission.count({ where });
  }

  async getStats() {
    const [total, pending, diterima, diproses, ditolak] = await Promise.all([
      prisma.sampleSubmission.count(),
      prisma.sampleSubmission.count({ where: { status: 'pending' } }),
      prisma.sampleSubmission.count({ where: { status: 'diterima' } }),
      prisma.sampleSubmission.count({ where: { status: 'diproses' } }),
      prisma.sampleSubmission.count({ where: { status: 'ditolak' } }),
    ]);

    return {
      total,
      pending,
      diterima,
      diproses,
      ditolak,
    };
  }
}
