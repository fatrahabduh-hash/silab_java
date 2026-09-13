import { z } from 'zod';

export const createReceiptSchema = z.object({
  body: z.object({
    nomorPenerimaan: z.string().trim().max(50).optional(),
    klien: z
      .string({ required_error: 'Nama klien wajib diisi' })
      .trim()
      .min(2, 'Nama klien minimal 2 karakter')
      .max(150, 'Nama klien maksimal 150 karakter'),
    tanggalTerima: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal harus YYYY-MM-DD')
      .optional(),
    jumlahSampel: z.coerce.number().int().nonnegative().optional(),
    jenisMaterial: z.string().trim().max(200).optional(),
    metodeUji: z.string().trim().max(200).optional(),
    keterangan: z.string().trim().optional(),
    samples: z
      .array(
        z.object({
          kodeSampel: z.string().trim().max(20).optional(),
          jenisMaterial: z
            .string({ required_error: 'Jenis material wajib diisi' })
            .trim()
            .min(1, 'Jenis material wajib diisi')
            .max(100),
          beratGram: z.coerce.number().positive().optional(),
          klien: z.string().trim().max(100).optional(),
          metodeUji: z.string().trim().max(50).optional(),
          keterangan: z.string().trim().optional(),
        })
      )
      .optional(),
  }),
});

export const createSampleSchema = z.object({
  body: z.object({
    penerimaanId: z.coerce.number().int().positive().optional().nullable(),
    kodeSampel: z.string().trim().max(20).optional(),
    tanggalMasuk: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal harus YYYY-MM-DD')
      .optional(),
    jenisMaterial: z
      .string({ required_error: 'Jenis material sampel wajib diisi' })
      .trim()
      .min(1, 'Jenis material sampel wajib diisi')
      .max(100, 'Jenis material maksimal 100 karakter'),
    beratGram: z.coerce.number().positive('Berat sampel harus bernilai positif').optional().nullable(),
    klien: z.string().trim().max(100).optional().nullable(),
    metodeUji: z.string().trim().max(50).optional().nullable(),
    keterangan: z.string().trim().optional().nullable(),
  }),
});

export const updateSampleStatusSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID sampel tidak valid'),
  }),
  body: z.object({
    status: z.enum(['antrian', 'diuji', 'review', 'selesai', 'ditolak'], {
      required_error: 'Status sampel baru wajib dipilih',
    }),
    catatan: z.string().trim().optional(),
  }),
});

export const updateReceiptStatusSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID penerimaan tidak valid'),
  }),
  body: z.object({
    status: z.enum(['diterima', 'diproses', 'selesai', 'dibatalkan']).optional(),
    isConfirmed: z.boolean().optional(),
  }),
});

export const sampleQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().trim().optional(),
    status: z.enum(['antrian', 'diuji', 'review', 'selesai', 'ditolak']).optional(),
    klien: z.string().trim().optional(),
    metodeUji: z.string().trim().optional(),
    penerimaanId: z.coerce.number().int().positive().optional(),
  }),
});

export const receiptQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().trim().optional(),
    status: z.enum(['diterima', 'diproses', 'selesai', 'dibatalkan']).optional(),
    klien: z.string().trim().optional(),
  }),
});

export type CreateReceiptBody = z.infer<typeof createReceiptSchema>['body'];
export type CreateSampleBody = z.infer<typeof createSampleSchema>['body'];
export type UpdateSampleStatusBody = z.infer<typeof updateSampleStatusSchema>['body'];
export type UpdateReceiptStatusBody = z.infer<typeof updateReceiptStatusSchema>['body'];
