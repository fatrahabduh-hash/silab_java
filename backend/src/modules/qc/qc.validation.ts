import { z } from 'zod';

const qcTypeEnum = z.enum(['blanko', 'standar', 'spike', 'duplikat']);
const qcFlagEnum = z.enum(['pass', 'fail', 'warning']);
const qcStatusEnum = z.enum(['pending', 'disetujui', 'ditolak']);

export const createQcSchema = z.object({
  body: z.object({
    preparasiId: z.coerce.number().int().positive().optional().nullable(),
    sampelId: z.coerce.number({ required_error: 'ID sampel wajib diisi' }).int().positive(),
    tipeQc: qcTypeEnum,
    parameter: z.string().trim().max(100).optional().nullable(),
    nilaiQc: z.coerce.number().optional().nullable(),
    nilaiExpected: z.coerce.number().optional().nullable(),
    satuan: z.string().trim().max(20).optional().default('%'),
    batasMinPct: z.coerce.number().optional().default(85.0),
    batasMaksPct: z.coerce.number().optional().default(115.0),
    tanggalUji: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
      .optional()
      .nullable(),
  }),
});

export const createStandardSampleSchema = z.object({
  body: z.object({
    sampelKey: z.string({ required_error: 'ID atau kode sampel wajib diisi' }).trim().min(1),
    nilaiSertifikat: z.coerce.number({ required_error: 'Nilai sertifikat CRM wajib diisi' }),
    parameter: z.string({ required_error: 'Parameter wajib diisi' }).trim().min(1).max(100),
  }),
});

export const reviewQcSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID QC tidak valid'),
  }),
  body: z.object({
    keputusan: z.enum(['disetujui', 'ditolak'], {
      required_error: 'Keputusan review wajib dipilih (disetujui / ditolak)',
    }),
    catatanReview: z.string().trim().optional().nullable(),
  }),
});

export const qcQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    sampelId: z.coerce.number().int().positive().optional(),
    tipeQc: qcTypeEnum.optional(),
    flag: qcFlagEnum.optional(),
    statusQc: qcStatusEnum.optional(),
    parameter: z.string().trim().optional(),
    search: z.string().trim().optional(),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format dateFrom harus YYYY-MM-DD')
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format dateTo harus YYYY-MM-DD')
      .optional(),
  }),
});

export type CreateQcBody = z.infer<typeof createQcSchema>['body'];
export type CreateStandardSampleBody = z.infer<typeof createStandardSampleSchema>['body'];
export type ReviewQcBody = z.infer<typeof reviewQcSchema>['body'];
export type QcQueryFilter = z.infer<typeof qcQuerySchema>['query'];
