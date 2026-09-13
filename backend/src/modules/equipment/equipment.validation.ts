import { z } from 'zod';

const equipmentStatusEnum = z.enum(['tersedia', 'digunakan', 'maintenance', 'rusak']);

export const createEquipmentSchema = z.object({
  body: z.object({
    kodeAlat: z
      .string({ required_error: 'Kode alat wajib diisi' })
      .trim()
      .min(2, 'Kode alat minimal 2 karakter')
      .max(20, 'Kode alat maksimal 20 karakter'),
    nama: z
      .string({ required_error: 'Nama peralatan wajib diisi' })
      .trim()
      .min(2, 'Nama alat minimal 2 karakter')
      .max(150, 'Nama alat maksimal 150 karakter'),
    lokasi: z.string().trim().max(100).optional().nullable(),
    status: equipmentStatusEnum.optional().default('tersedia'),
    tanggalKalibrasi: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal kalibrasi harus YYYY-MM-DD')
      .optional()
      .nullable(),
    masaBerlakuKalibrasi: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format masa berlaku kalibrasi harus YYYY-MM-DD')
      .optional()
      .nullable(),
    jamPakai: z.coerce.number().int().min(0).optional().default(0),
    jadwalMaintenance: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal jadwal maintenance harus YYYY-MM-DD')
      .optional()
      .nullable(),
    pic: z.string().trim().max(100).optional().nullable(),
    catatan: z.string().trim().optional().nullable(),
  }),
});

export const updateEquipmentSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID peralatan tidak valid'),
  }),
  body: z.object({
    nama: z.string().trim().min(2).max(150).optional(),
    lokasi: z.string().trim().max(100).optional().nullable(),
    status: equipmentStatusEnum.optional(),
    tanggalKalibrasi: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal kalibrasi harus YYYY-MM-DD')
      .optional()
      .nullable(),
    masaBerlakuKalibrasi: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format masa berlaku kalibrasi harus YYYY-MM-DD')
      .optional()
      .nullable(),
    jamPakai: z.coerce.number().int().min(0).optional(),
    jadwalMaintenance: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal jadwal maintenance harus YYYY-MM-DD')
      .optional()
      .nullable(),
    pic: z.string().trim().max(100).optional().nullable(),
    catatan: z.string().trim().optional().nullable(),
  }),
});

export const updateEquipmentStatusSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID peralatan tidak valid'),
  }),
  body: z.object({
    status: equipmentStatusEnum,
  }),
});

export const logUsageSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID peralatan tidak valid'),
  }),
  body: z.object({
    tambahanJam: z.coerce
      .number({ required_error: 'Tambahan jam pakai wajib diisi' })
      .int('Tambahan jam harus berupa bilangan bulat')
      .positive('Tambahan jam pakai harus lebih dari 0'),
    catatan: z.string().trim().optional().nullable(),
  }),
});

export const queryEquipmentSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    status: equipmentStatusEnum.optional(),
    search: z.string().trim().optional(),
    lokasi: z.string().trim().optional(),
    kalibrasiStatus: z.enum(['kadaluarsa', 'segera', 'valid']).optional(),
  }),
});
