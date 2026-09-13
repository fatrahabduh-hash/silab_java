import { Router } from 'express';
import { WorkOrderController } from './work-order.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import {
  createWorkOrderSchema,
  updateWorkOrderStatusSchema,
  workOrderQuerySchema,
} from './work-order.validation.js';

export const workOrderRouter = Router();

// Seluruh endpoint Work Order memerlukan autentikasi JWT
workOrderRouter.use(authenticate);

// POST /api/v1/work-orders — Terbitkan Work Order baru (Admin / Supervisor)
workOrderRouter.post(
  '/',
  authorize('admin', 'supervisor'),
  validateRequest(createWorkOrderSchema),
  asyncHandler(WorkOrderController.createWorkOrder)
);

// GET /api/v1/work-orders/available-samples — Sampel yang siap dialokasikan
workOrderRouter.get(
  '/available-samples',
  authorize('admin', 'supervisor', 'analis'),
  asyncHandler(WorkOrderController.getAvailableSamples)
);

// GET /api/v1/work-orders — Daftar Work Order
workOrderRouter.get(
  '/',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(workOrderQuerySchema),
  asyncHandler(WorkOrderController.getWorkOrders)
);

// GET /api/v1/work-orders/:id — Detail Work Order
workOrderRouter.get(
  '/:id',
  authorize('admin', 'supervisor', 'analis'),
  asyncHandler(WorkOrderController.getWorkOrderById)
);

// PATCH /api/v1/work-orders/:id/status — Perbarui status (aktif, selesai, batal)
workOrderRouter.patch(
  '/:id/status',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(updateWorkOrderStatusSchema),
  asyncHandler(WorkOrderController.updateStatus)
);
