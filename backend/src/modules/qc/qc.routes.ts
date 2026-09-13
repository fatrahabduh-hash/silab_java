import { Router } from 'express';
import { QcController } from './qc.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import {
  createQcSchema,
  createStandardSampleSchema,
  reviewQcSchema,
  qcQuerySchema,
} from './qc.validation.js';

export const qcRouter = Router();

// Seluruh rute QC mewajibkan otentikasi JWT
qcRouter.use(authenticate);

// GET /api/v1/qc/stats — Statistik ringkasan mutu QC dasbor (sebelum /:id)
qcRouter.get('/stats', asyncHandler(QcController.getQcStatistics));

// POST /api/v1/qc/standard — Pendaftaran acuan standar CRM (sebelum /:id)
qcRouter.post(
  '/standard',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(createStandardSampleSchema),
  asyncHandler(QcController.createStandardSample)
);

// POST /api/v1/qc — Input data pengujian QC analitis (Admin, Supervisor, Analis)
qcRouter.post(
  '/',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(createQcSchema),
  asyncHandler(QcController.createQc)
);

// PATCH /api/v1/qc/:id/review — Review & validasi mutu (Khusus Supervisor & Admin)
qcRouter.patch(
  '/:id/review',
  authorize('admin', 'supervisor'),
  validateRequest(reviewQcSchema),
  asyncHandler(QcController.reviewQc)
);

// GET /api/v1/qc — Riwayat data QC analitis (Multi-tenant scoped)
qcRouter.get(
  '/',
  validateRequest(qcQuerySchema),
  asyncHandler(QcController.getQcRecords)
);

// GET /api/v1/qc/:id — Detail catatan QC
qcRouter.get('/:id', asyncHandler(QcController.getQcById));

// DELETE /api/v1/qc/:id — Hapus catatan QC (Khusus Supervisor & Admin)
qcRouter.delete(
  '/:id',
  authorize('admin', 'supervisor'),
  asyncHandler(QcController.deleteQc)
);
