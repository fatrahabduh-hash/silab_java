import { Router } from 'express';
import { SampleController } from './sample.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import {
  createReceiptSchema,
  createSampleSchema,
  updateSampleStatusSchema,
  updateReceiptStatusSchema,
  sampleQuerySchema,
  receiptQuerySchema,
} from './sample.validation.js';

export const sampleRouter = Router();

// Seluruh endpoint sampel memerlukan autentikasi Bearer Token JWT
sampleRouter.use(authenticate);

/**
 * Endpoint Batch Penerimaan Sampel (Sample Receipts)
 */
sampleRouter.post(
  '/receipts',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(createReceiptSchema),
  asyncHandler(SampleController.createReceipt)
);

sampleRouter.get(
  '/receipts',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(receiptQuerySchema),
  asyncHandler(SampleController.getReceipts)
);

sampleRouter.get(
  '/receipts/:id',
  authorize('admin', 'supervisor', 'analis'),
  asyncHandler(SampleController.getReceiptById)
);

sampleRouter.patch(
  '/receipts/:id/status',
  authorize('admin', 'supervisor'),
  validateRequest(updateReceiptStatusSchema),
  asyncHandler(SampleController.updateReceiptStatus)
);

/**
 * Endpoint Registrasi & Pengelolaan Sampel Satuan (Individual Samples)
 */
sampleRouter.post(
  '/',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(createSampleSchema),
  asyncHandler(SampleController.createSample)
);

sampleRouter.get(
  '/',
  validateRequest(sampleQuerySchema),
  asyncHandler(SampleController.getSamples)
);

sampleRouter.get(
  '/:id',
  asyncHandler(SampleController.getSampleById)
);

sampleRouter.patch(
  '/:id/status',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(updateSampleStatusSchema),
  asyncHandler(SampleController.updateSampleStatus)
);
