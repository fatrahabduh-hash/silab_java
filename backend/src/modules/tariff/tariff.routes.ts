import { Router } from 'express';
import { TariffController } from './tariff.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import {
  createTariffSchema,
  updateTariffSchema,
  queryTariffSchema,
} from './tariff.validation.js';

export const tariffRouter = Router();

// Seluruh rute tarif membutuhkan login
tariffRouter.use(authenticate);

// GET /api/v1/tariffs — Ambil daftar tarif pengujian (Semua role termasuk analis & client)
tariffRouter.get(
  '/',
  validateRequest(queryTariffSchema),
  asyncHandler(TariffController.getTariffList)
);

// GET /api/v1/tariffs/:id — Detail tarif
tariffRouter.get('/:id', asyncHandler(TariffController.getTariffById));

// POST /api/v1/tariffs — Tambah tarif baru (Admin & Supervisor)
tariffRouter.post(
  '/',
  authorize('admin', 'supervisor'),
  validateRequest(createTariffSchema),
  asyncHandler(TariffController.createTariff)
);

// PUT /api/v1/tariffs/:id — Perbarui tarif (Admin & Supervisor)
tariffRouter.put(
  '/:id',
  authorize('admin', 'supervisor'),
  validateRequest(updateTariffSchema),
  asyncHandler(TariffController.updateTariff)
);

// DELETE /api/v1/tariffs/:id — Hapus / Nonaktifkan tarif (Admin & Supervisor)
tariffRouter.delete(
  '/:id',
  authorize('admin', 'supervisor'),
  asyncHandler(TariffController.deleteTariff)
);
