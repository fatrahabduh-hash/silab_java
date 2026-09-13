import { Router } from 'express';
import { EquipmentController } from './equipment.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  updateEquipmentStatusSchema,
  logUsageSchema,
  queryEquipmentSchema,
} from './equipment.validation.js';

export const equipmentRouter = Router();

// Seluruh rute Peralatan mewajibkan otentikasi JWT
equipmentRouter.use(authenticate);

// GET /api/v1/equipment/stats — Ringkasan metrik inventaris alat (sebelum /:id)
equipmentRouter.get('/stats', asyncHandler(EquipmentController.getStats));

// GET /api/v1/equipment — Daftar peralatan dengan filter
equipmentRouter.get(
  '/',
  validateRequest(queryEquipmentSchema),
  asyncHandler(EquipmentController.getEquipmentList)
);

// GET /api/v1/equipment/:id — Detail peralatan
equipmentRouter.get('/:id', asyncHandler(EquipmentController.getEquipmentById));

// POST /api/v1/equipment — Registrasi peralatan baru (Admin, Supervisor, Analis)
equipmentRouter.post(
  '/',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(createEquipmentSchema),
  asyncHandler(EquipmentController.createEquipment)
);

// PUT /api/v1/equipment/:id — Perbarui spesifikasi alat
equipmentRouter.put(
  '/:id',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(updateEquipmentSchema),
  asyncHandler(EquipmentController.updateEquipment)
);

// PATCH /api/v1/equipment/:id/status — Perbarui status kondisi alat
equipmentRouter.patch(
  '/:id/status',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(updateEquipmentStatusSchema),
  asyncHandler(EquipmentController.updateStatus)
);

// POST /api/v1/equipment/:id/log-usage — Tambah jam pemakaian operasional alat
equipmentRouter.post(
  '/:id/log-usage',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(logUsageSchema),
  asyncHandler(EquipmentController.logUsage)
);

// DELETE /api/v1/equipment/:id — Hapus peralatan (Khusus Admin & Supervisor)
equipmentRouter.delete(
  '/:id',
  authorize('admin', 'supervisor'),
  asyncHandler(EquipmentController.deleteEquipment)
);
