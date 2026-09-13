import { Router } from 'express';
import { PreparationController } from './preparation.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import {
  createPreparationSchema,
  updatePreparationSchema,
  preparationQuerySchema,
} from './preparation.validation.js';

export const preparationRouter = Router();

// Seluruh endpoint preparasi mewajibkan otentikasi JWT
preparationRouter.use(authenticate);

// GET /api/v1/preparations/reagents — Daftar reagen kimia siap pakai (ditaruh sebelum /:id)
preparationRouter.get(
  '/reagents',
  asyncHandler(PreparationController.getAvailableReagents)
);

// POST /api/v1/preparations — Simpan catatan preparasi baru (Admin, Supervisor, Analis)
preparationRouter.post(
  '/',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(createPreparationSchema),
  asyncHandler(PreparationController.createPreparation)
);

// GET /api/v1/preparations — Riwayat preparasi dengan filter
preparationRouter.get(
  '/',
  validateRequest(preparationQuerySchema),
  asyncHandler(PreparationController.getPreparations)
);

// GET /api/v1/preparations/:id — Detail spesifik preparasi sampel
preparationRouter.get(
  '/:id',
  asyncHandler(PreparationController.getPreparationById)
);

// PATCH /api/v1/preparations/:id — Perbarui catatan preparasi (Admin, Supervisor, Analis)
preparationRouter.patch(
  '/:id',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(updatePreparationSchema),
  asyncHandler(PreparationController.updatePreparation)
);

// DELETE /api/v1/preparations/:id — Hapus catatan preparasi (Admin, Supervisor)
preparationRouter.delete(
  '/:id',
  authorize('admin', 'supervisor'),
  asyncHandler(PreparationController.deletePreparation)
);
