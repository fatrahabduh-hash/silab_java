import { z } from 'zod';

const preparationMethodEnum = z.enum([
  'destruksi_asam',
  'ekstraksi',
  'pengenceran',
  'fusion',
  'lainnya',
]);

const reagentItemSchema = z.object({
  bahanId: z.coerce.number({ required_error: 'ID bahan kimia harus diisi' }).int().positive(),
  jumlah: z.coerce
    .number({ required_error: 'Jumlah pemakaian harus diisi' })
    .positive('Jumlah pemakaian harus lebih besar dari 0'),
  satuan: z.string().optional(),
  lot: z.string().optional(),
});

export const createPreparationSchema = z.object({
  body: z
    .object({
      modeInput: z.enum(['single', 'wo']).optional().default('single'),
      workOrderId: z.coerce.number().int().positive().optional().nullable(),
      sampelId: z.coerce.number().int().positive().optional().nullable(),
      sampelIds: z.array(z.coerce.number().int().positive()).optional(),
      metodePreparasi: preparationMethodEnum,
      prosedur: z.string().trim().optional().nullable(),
      faktorPengenceran: z.coerce.number().positive().optional().default(1.0),
      volumeAwalMl: z.coerce.number().nonnegative().optional().nullable(),
      volumeAkhirMl: z.coerce.number().nonnegative().optional().nullable(),
      reagen: z.array(reagentItemSchema).optional().default([]),
      blankoDisiapkan: z.boolean().optional().default(false),
      standarDisiapkan: z.boolean().optional().default(false),
      spikeDisiapkan: z.boolean().optional().default(false),
      duplikatDisiapkan: z.boolean().optional().default(false),
      suhuRuang: z.coerce.number().optional().nullable(),
      kelembaban: z.coerce.number().optional().nullable(),
      catatan: z.string().trim().optional().nullable(),
      analisId: z.coerce.number().int().positive().optional().nullable(),
      tanggalPreparasi: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
        .optional()
        .nullable(),
    })
    .refine(
      (data) => {
        if (data.modeInput === 'single') {
          return data.sampelId !== undefined && data.sampelId !== null;
        }
        return (
          (data.workOrderId !== undefined && data.workOrderId !== null) ||
          (data.sampelIds !== undefined && data.sampelIds.length > 0)
        );
      },
      {
        message:
          'Sampel target harus ditentukan (sampelId untuk mode single, atau workOrderId / sampelIds untuk mode WO)',
        path: ['sampelId'],
      }
    ),
});

export const updatePreparationSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID Preparasi tidak valid'),
  }),
  body: z.object({
    prosedur: z.string().trim().optional().nullable(),
    faktorPengenceran: z.coerce.number().positive().optional(),
    volumeAwalMl: z.coerce.number().nonnegative().optional().nullable(),
    volumeAkhirMl: z.coerce.number().nonnegative().optional().nullable(),
    blankoDisiapkan: z.boolean().optional(),
    standarDisiapkan: z.boolean().optional(),
    spikeDisiapkan: z.boolean().optional(),
    duplikatDisiapkan: z.boolean().optional(),
    suhuRuang: z.coerce.number().optional().nullable(),
    kelembaban: z.coerce.number().optional().nullable(),
    catatan: z.string().trim().optional().nullable(),
    analisId: z.coerce.number().int().positive().optional().nullable(),
    tanggalPreparasi: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
      .optional()
      .nullable(),
  }),
});

export const preparationQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    workOrderId: z.coerce.number().int().positive().optional(),
    sampelId: z.coerce.number().int().positive().optional(),
    metodePreparasi: preparationMethodEnum.optional(),
    analisId: z.coerce.number().int().positive().optional(),
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

export type CreatePreparationBody = z.infer<typeof createPreparationSchema>['body'];
export type UpdatePreparationBody = z.infer<typeof updatePreparationSchema>['body'];
export type PreparationQueryFilter = z.infer<typeof preparationQuerySchema>['query'];
