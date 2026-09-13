import { z } from 'zod';

export const createTariffSchema = z.object({
  body: z.object({
    nama: z
      .string({ required_error: 'Nama tarif/layanan pengujian wajib diisi' })
      .trim()
      .min(2, 'Nama minimal 2 karakter')
      .max(150, 'Nama maksimal 150 karakter'),
    metode: z.string().trim().max(50).optional().nullable(),
    parameter: z.string().trim().max(100).optional().nullable(),
    harga: z.coerce
      .number({ required_error: 'Harga tarif wajib diisi' })
      .min(0, 'Harga tidak boleh negatif'),
    satuan: z.string().trim().max(50).optional().default('per parameter'),
    aktif: z.boolean().optional().default(true),
  }),
});

export const updateTariffSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID tarif tidak valid'),
  }),
  body: z.object({
    nama: z.string().trim().min(2).max(150).optional(),
    metode: z.string().trim().max(50).optional().nullable(),
    parameter: z.string().trim().max(100).optional().nullable(),
    harga: z.coerce.number().min(0).optional(),
    satuan: z.string().trim().max(50).optional(),
    aktif: z.boolean().optional(),
  }),
});

export const queryTariffSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(50),
    search: z.string().trim().optional(),
    parameter: z.string().trim().optional(),
    metode: z.string().trim().optional(),
    aktif: z.enum(['true', 'false', '1', '0']).optional().transform((v) => v === 'true' || v === '1'),
  }),
});
