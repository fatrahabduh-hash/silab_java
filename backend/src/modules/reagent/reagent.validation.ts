import { z } from 'zod';

export const createReagentSchema = z.object({
  body: z.object({
    kodeBahan: z
      .string({ required_error: 'Kode bahan/reagen wajib diisi' })
      .trim()
      .min(2, 'Kode bahan minimal 2 karakter')
      .max(20, 'Kode bahan maksimal 20 karakter'),
    nama: z
      .string({ required_error: 'Nama reagen wajib diisi' })
      .trim()
      .min(2, 'Nama bahan minimal 2 karakter')
      .max(150, 'Nama bahan maksimal 150 karakter'),
    stok: z.coerce.number().min(0, 'Stok awal tidak boleh negatif').optional().default(0),
    satuan: z.string().trim().max(20).optional().default('gr'),
    stokMinimum: z.coerce.number().min(0).optional().default(0),
    supplier: z.string().trim().max(100).optional().nullable(),
    tanggalKadaluarsa: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal kadaluarsa harus YYYY-MM-DD')
      .optional()
      .nullable(),
  }),
});

export const updateReagentSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID bahan tidak valid'),
  }),
  body: z.object({
    nama: z.string().trim().min(2).max(150).optional(),
    satuan: z.string().trim().max(20).optional(),
    stokMinimum: z.coerce.number().min(0).optional(),
    supplier: z.string().trim().max(100).optional().nullable(),
    tanggalKadaluarsa: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal kadaluarsa harus YYYY-MM-DD')
      .optional()
      .nullable(),
  }),
});

export const stockAdjustSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID bahan tidak valid'),
  }),
  body: z.object({
    jenis: z.enum(['masuk', 'keluar', 'opname'], {
      required_error: 'Jenis penyesuaian stok wajib dipilih (masuk / keluar / opname)',
    }),
    jumlah: z.coerce
      .number({ required_error: 'Jumlah penyesuaian wajib diisi' })
      .positive('Jumlah penyesuaian harus lebih dari 0'),
    keterangan: z.string().trim().max(255).optional().nullable(),
  }),
});

export const queryReagentSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    search: z.string().trim().optional(),
    statusStok: z.enum(['kritis', 'aman']).optional(),
    statusKadaluarsa: z.enum(['kadaluarsa', 'segera', 'aman']).optional(),
  }),
});
