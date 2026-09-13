import { Router } from 'express';
import { ReagentController } from './reagent.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import {
  createReagentSchema,
  updateReagentSchema,
  stockAdjustSchema,
  queryReagentSchema,
} from './reagent.validation.js';

export const reagentRouter = Router();

// Seluruh rute Reagen mewajibkan otentikasi JWT
reagentRouter.use(authenticate);

// GET /api/v1/reagents/stats — Ringkasan metrik inventaris bahan kimia (sebelum /:id)
reagentRouter.get('/stats', asyncHandler(ReagentController.getStats));

// GET /api/v1/reagents — Daftar bahan kimia dengan filter
reagentRouter.get(
  '/',
  validateRequest(queryReagentSchema),
  asyncHandler(ReagentController.getReagentList)
);

// GET /api/v1/reagents/:id — Detail bahan kimia
reagentRouter.get('/:id', asyncHandler(ReagentController.getReagentById));

// POST /api/v1/reagents — Registrasi bahan kimia baru (Admin, Supervisor, Analis)
reagentRouter.post(
  '/',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(createReagentSchema),
  asyncHandler(ReagentController.createReagent)
);

// PUT /api/v1/reagents/:id — Perbarui data bahan kimia
reagentRouter.put(
  '/:id',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(updateReagentSchema),
  asyncHandler(ReagentController.updateReagent)
);

// POST /api/v1/reagents/:id/stock-adjust — Penyesuaian stok (masuk, keluar, opname)
reagentRouter.post(
  '/:id/stock-adjust',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(stockAdjustSchema),
  asyncHandler(ReagentController.adjustStock)
);

// DELETE /api/v1/reagents/:id — Hapus bahan kimia (Khusus Admin & Supervisor)
reagentRouter.delete(
  '/:id',
  authorize('admin', 'supervisor'),
  asyncHandler(ReagentController.deleteReagent)
);
