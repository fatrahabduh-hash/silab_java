import { z } from 'zod';

const submissionStatusEnum = z.enum(['pending', 'diterima', 'diproses', 'ditolak']);

const submissionDetailSchema = z.object({
  jenisMaterial: z
    .string({ required_error: 'Jenis material sampel wajib diisi' })
    .trim()
    .min(2, 'Jenis material minimal 2 karakter')
    .max(100),
  beratGram: z.coerce.number().positive('Berat sampel harus lebih dari 0').optional().nullable(),
  metodeUji: z.string().trim().max(50).optional().nullable(),
  parameter: z.string().trim().max(100).optional().nullable(),
  keterangan: z.string().trim().optional().nullable(),
});

export const createSubmissionSchema = z.object({
  body: z.object({
    nomorSubmission: z.string().trim().max(30).optional(),
    klien: z
      .string({ required_error: 'Nama perusahaan/klien wajib diisi' })
      .trim()
      .min(2, 'Nama klien minimal 2 karakter')
      .max(150),
    kontakPerson: z.string().trim().max(150).optional().nullable(),
    email: z
      .string({ required_error: 'Email narahubung wajib diisi' })
      .trim()
      .email('Format email tidak valid')
      .max(150),
    telepon: z.string().trim().max(50).optional().nullable(),
    alamat: z.string().trim().optional().nullable(),
    poReferensi: z.string().trim().max(100).optional().nullable(),
    instruksiKhusus: z.string().trim().optional().nullable(),
    catatan: z.string().trim().optional().nullable(),
    samples: z
      .array(submissionDetailSchema)
      .min(1, 'Minimal satu rincian sampel uji wajib disertakan'),
  }),
});

export const updateSubmissionStatusSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID permohonan tidak valid'),
  }),
  body: z.object({
    status: submissionStatusEnum,
    catatan: z.string().trim().optional().nullable(),
  }),
});

export const convertSubmissionSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID permohonan tidak valid'),
  }),
  body: z.object({
    nomorPenerimaan: z.string().trim().max(50).optional(),
    catatan: z.string().trim().optional().nullable(),
  }),
});

export const querySubmissionSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    search: z.string().trim().optional(),
    status: submissionStatusEnum.optional(),
    klien: z.string().trim().optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});
