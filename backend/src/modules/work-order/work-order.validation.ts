import { z } from 'zod';

export const createWorkOrderSchema = z.object({
  body: z
    .object({
      nomorWo: z.string().trim().max(20).optional(),
      mode: z.enum(['batch', 'single']).optional().default('batch'),
      penerimaanId: z.coerce.number().int().positive().optional().nullable(),
      sampelIds: z.array(z.coerce.number().int().positive()).optional(),
      analisId: z.coerce.number().int().positive().optional().nullable(),
      peralatanId: z.coerce.number().int().positive().optional().nullable(),
      parameter: z.string().trim().max(200).optional().nullable(),
      metode: z.string().trim().max(50).optional().nullable(),
      prioritas: z.enum(['normal', 'tinggi', 'urgent']).optional().default('normal'),
      jadwalMulai: z.string().optional().nullable(),
      jadwalSelesai: z.string().optional().nullable(),
      statusAwal: z.enum(['draft', 'aktif']).optional().default('draft'),
      catatan: z.string().trim().optional().nullable(),
    })
    .refine(
      (data) => {
        if (data.mode === 'batch') {
          return data.penerimaanId !== undefined && data.penerimaanId !== null;
        }
        return data.sampelIds !== undefined && data.sampelIds.length > 0;
      },
      {
        message:
          'Untuk mode batch wajib menyertakan penerimaanId, untuk mode single wajib menyertakan minimal satu sampelId',
        path: ['mode'],
      }
    ),
});

export const updateWorkOrderStatusSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID Work Order tidak valid'),
  }),
  body: z.object({
    status: z.enum(['aktif', 'selesai', 'dibatalkan'], {
      required_error: 'Status baru wajib dipilih (aktif, selesai, dibatalkan)',
    }),
    catatan: z.string().trim().optional(),
  }),
});

export const workOrderQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().trim().optional(),
    status: z.enum(['draft', 'aktif', 'selesai', 'dibatalkan']).optional(),
    prioritas: z.enum(['normal', 'tinggi', 'urgent']).optional(),
    analisId: z.coerce.number().int().positive().optional(),
    penerimaanId: z.coerce.number().int().positive().optional(),
  }),
});

export type CreateWorkOrderBody = z.infer<typeof createWorkOrderSchema>['body'];
export type UpdateWorkOrderStatusBody = z.infer<typeof updateWorkOrderStatusSchema>['body'];
export type WorkOrderQueryFilterBody = z.infer<typeof workOrderQuerySchema>['query'];
