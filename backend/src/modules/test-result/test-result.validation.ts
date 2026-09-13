import { z } from 'zod';

const testConclusionEnum = z.enum(['lulus', 'tidak_lulus', 'pending']);

export const createTestResultSchema = z.object({
  body: z.object({
    kodeUji: z.string().trim().max(20).optional(),
    sampelId: z.coerce.number({ required_error: 'ID sampel wajib diisi' }).int().positive(),
    noReferensi: z.string().trim().max(50).optional().nullable(),
    preparasiId: z.coerce.number().int().positive().optional().nullable(),
    parameter: z.string({ required_error: 'Nama parameter uji wajib diisi' }).trim().min(1).max(100),
    nilai: z.coerce.number({ required_error: 'Nilai hasil uji wajib diisi' }),
    faktorPengenceran: z.coerce.number().positive().optional(),
    satuan: z.string().trim().max(20).optional().default('%'),
    faktorKonversi: z.coerce.number().positive().optional(),
    batasMin: z.coerce.number().optional().nullable(),
    batasMaks: z.coerce.number().optional().nullable(),
    metode: z.string().trim().max(50).optional().default('AAS'),
    alatId: z.coerce.number().int().positive().optional().nullable(),
    analisId: z.coerce.number().int().positive().optional().nullable(),
    kesimpulan: testConclusionEnum.optional(),
    catatan: z.string().trim().optional().nullable(),
    tanggalUji: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
      .optional()
      .nullable(),
  }),
});

export const batchTestResultRowSchema = z.object({
  sampelId: z.coerce.number({ required_error: 'ID sampel wajib diisi' }).int().positive(),
  parameter: z.string({ required_error: 'Parameter wajib diisi' }).trim().min(1).max(100),
  nilai: z.coerce.number({ required_error: 'Nilai wajib diisi' }),
  satuan: z.string().trim().max(20).optional(),
  metode: z.string().trim().max(50).optional(),
  preparasiId: z.coerce.number().int().positive().optional().nullable(),
  faktorPengenceran: z.coerce.number().positive().optional(),
  faktorKonversi: z.coerce.number().positive().optional(),
  batasMin: z.coerce.number().optional().nullable(),
  batasMaks: z.coerce.number().optional().nullable(),
  kesimpulan: testConclusionEnum.optional(),
  noReferensi: z.string().trim().max(50).optional().nullable(),
  catatan: z.string().trim().optional().nullable(),
});

export const createBatchTestResultSchema = z.object({
  body: z.object({
    rows: z.array(batchTestResultRowSchema).min(1, 'Minimal harus ada 1 baris hasil pengujian'),
    analisId: z.coerce.number().int().positive().optional().nullable(),
    alatId: z.coerce.number().int().positive().optional().nullable(),
    tanggalUji: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
      .optional()
      .nullable(),
    metode: z.string().trim().max(50).optional(),
    satuan: z.string().trim().max(20).optional(),
  }),
});

export const updateTestResultSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID Hasil Uji tidak valid'),
  }),
  body: z.object({
    parameter: z.string().trim().min(1).max(100).optional(),
    nilai: z.coerce.number().optional(),
    faktorPengenceran: z.coerce.number().positive().optional(),
    faktorKonversi: z.coerce.number().positive().optional(),
    batasMin: z.coerce.number().optional().nullable(),
    batasMaks: z.coerce.number().optional().nullable(),
    satuan: z.string().trim().max(20).optional(),
    metode: z.string().trim().max(50).optional(),
    alatId: z.coerce.number().int().positive().optional().nullable(),
    analisId: z.coerce.number().int().positive().optional().nullable(),
    kesimpulan: testConclusionEnum.optional(),
    catatan: z.string().trim().optional().nullable(),
    tanggalUji: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
      .optional()
      .nullable(),
  }),
});

export const testResultQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    sampelId: z.coerce.number().int().positive().optional(),
    penerimaanId: z.coerce.number().int().positive().optional(),
    kodeUji: z.string().trim().optional(),
    parameter: z.string().trim().optional(),
    kesimpulan: testConclusionEnum.optional(),
    metode: z.string().trim().optional(),
    analisId: z.coerce.number().int().positive().optional(),
    alatId: z.coerce.number().int().positive().optional(),
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

export type CreateTestResultBody = z.infer<typeof createTestResultSchema>['body'];
export type CreateBatchTestResultBody = z.infer<typeof createBatchTestResultSchema>['body'];
export type UpdateTestResultBody = z.infer<typeof updateTestResultSchema>['body'];
export type TestResultQueryFilter = z.infer<typeof testResultQuerySchema>['query'];
