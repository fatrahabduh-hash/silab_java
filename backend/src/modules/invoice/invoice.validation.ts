import { z } from 'zod';

const invoiceStatusEnum = z.enum(['draft', 'diterbitkan', 'lunas', 'dibatalkan']);

const invoiceItemSchema = z.object({
  deskripsi: z
    .string({ required_error: 'Deskripsi item tagihan wajib diisi' })
    .trim()
    .min(1, 'Deskripsi minimal 1 karakter')
    .max(250),
  sampelId: z.coerce.number().int().positive().optional().nullable(),
  tarifId: z.coerce.number().int().positive().optional().nullable(),
  qty: z.coerce
    .number({ required_error: 'Qty wajib diisi' })
    .int('Qty harus bilangan bulat')
    .positive('Qty minimal 1'),
  hargaSatuan: z.coerce
    .number({ required_error: 'Harga satuan wajib diisi' })
    .min(0, 'Harga satuan tidak boleh negatif'),
  catatan: z.string().trim().max(200).optional().nullable(),
});

export const createInvoiceSchema = z.object({
  body: z.object({
    nomorInvoice: z.string().trim().max(50).optional(),
    penerimaanId: z.coerce.number().int().positive().optional().nullable(),
    klien: z
      .string({ required_error: 'Nama klien wajib diisi' })
      .trim()
      .min(2, 'Nama klien minimal 2 karakter')
      .max(150),
    alamatKlien: z.string().trim().optional().nullable(),
    tanggalInvoice: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal invoice harus YYYY-MM-DD')
      .optional(),
    tanggalJatuhTempo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal jatuh tempo harus YYYY-MM-DD')
      .optional()
      .nullable(),
    diskonPct: z.coerce.number().min(0).max(100).optional().default(0),
    ppnPct: z.coerce.number().min(0).max(100).optional().default(11),
    status: invoiceStatusEnum.optional().default('draft'),
    catatan: z.string().trim().optional().nullable(),
    items: z
      .array(invoiceItemSchema)
      .min(1, 'Minimal satu rincian item tagihan wajib disertakan'),
  }),
});

export const updateInvoiceSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID invoice tidak valid'),
  }),
  body: z.object({
    alamatKlien: z.string().trim().optional().nullable(),
    tanggalInvoice: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal invoice harus YYYY-MM-DD')
      .optional(),
    tanggalJatuhTempo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal jatuh tempo harus YYYY-MM-DD')
      .optional()
      .nullable(),
    diskonPct: z.coerce.number().min(0).max(100).optional(),
    ppnPct: z.coerce.number().min(0).max(100).optional(),
    catatan: z.string().trim().optional().nullable(),
    items: z.array(invoiceItemSchema).min(1).optional(),
  }),
});

export const updateInvoiceStatusSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID invoice tidak valid'),
  }),
  body: z.object({
    status: invoiceStatusEnum,
    catatan: z.string().trim().max(255).optional().nullable(),
  }),
});

export const queryInvoiceSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    search: z.string().trim().optional(),
    status: invoiceStatusEnum.optional(),
    klien: z.string().trim().optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});
