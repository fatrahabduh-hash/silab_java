import { z } from 'zod';

export const xrfIngestionSchema = z.object({
  body: z.object({
    api_key: z.string().optional(),
    device_id: z.string().trim().min(1, 'device_id wajib disertakan'),
    device_name: z.string().trim().optional(),
    device_type: z.string().trim().optional(),
    db_source: z.string().trim().min(1, 'db_source wajib disertakan'),
    report_id: z.coerce.number().int().default(0),
    sample_name: z.string().trim().min(1, 'sample_name wajib diisi'),
    sample_supplier: z.string().trim().optional().nullable(),
    test_date: z.string().optional().nullable(),
    timestamp_ms: z.coerce.number().optional().nullable(),
    test_time: z.coerce.number().int().optional().nullable(),
    tub_voltage: z.coerce.number().optional().nullable(),
    tub_current: z.coerce.number().optional().nullable(),
    work_curve_name: z.string().trim().optional().nullable(),
    grade: z.string().trim().optional().nullable(),
    operator: z.string().trim().optional().nullable(),
    gps: z.string().trim().optional().nullable(),
    longitude: z.coerce.number().optional().nullable(),
    latitude: z.coerce.number().optional().nullable(),
    altitude: z.coerce.number().optional().nullable(),
    cps: z.coerce.number().int().optional().nullable(),
    counts: z.coerce.number().int().optional().nullable(),
    temperature: z.coerce.number().optional().nullable(),
    elements: z
      .array(
        z.object({
          name: z.string().trim().min(1, 'Nama unsur tidak boleh kosong'),
          concentration: z.coerce.number({ invalid_type_error: 'Konsentrasi unsur harus angka' }),
          error: z.coerce.number().optional().nullable(),
          unit: z.string().trim().optional().default('%'),
        })
      )
      .optional(),
  }),
});

export const xrfAdminAuthSchema = z.object({
  body: z.object({
    username: z
      .string({ required_error: 'Username wajib diisi' })
      .trim()
      .min(1, 'Username tidak boleh kosong'),
    password: z
      .string({ required_error: 'Password wajib diisi' })
      .min(1, 'Password tidak boleh kosong'),
    device_id: z.string().trim().optional().default('XRF-7000'),
  }),
});

export const xrfQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(200).optional().default(50),
    search: z.string().trim().optional(),
    deviceId: z.string().trim().optional(),
    dbSource: z.string().trim().optional(),
    workCurve: z.string().trim().optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal harus YYYY-MM-DD')
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}/, 'Format tanggal harus YYYY-MM-DD')
      .optional(),
    sampleId: z.coerce.number().int().positive().optional(),
  }),
});

export const linkSampleSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID pengukuran XRF tidak valid'),
  }),
  body: z.object({
    sampleId: z.coerce.number().int().positive().optional(),
    kodeSampel: z.string().trim().optional(),
  }),
});

export type XrfIngestionBody = z.infer<typeof xrfIngestionSchema>['body'];
export type XrfAdminAuthBody = z.infer<typeof xrfAdminAuthSchema>['body'];
export type XrfQueryFilterBody = z.infer<typeof xrfQuerySchema>['query'];
export type LinkSampleBody = z.infer<typeof linkSampleSchema>['body'];
