import { Router } from 'express';
import { TestResultController } from './test-result.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import {
  createTestResultSchema,
  createBatchTestResultSchema,
  updateTestResultSchema,
  testResultQuerySchema,
} from './test-result.validation.js';

export const testResultRouter = Router();

// Seluruh rute hasil uji mewajibkan otentikasi JWT
testResultRouter.use(authenticate);

// POST /api/v1/test-results/batch — Input hasil uji batch (Admin, Supervisor, Analis)
testResultRouter.post(
  '/batch',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(createBatchTestResultSchema),
  asyncHandler(TestResultController.createBatchTestResults)
);

// POST /api/v1/test-results — Input hasil uji tunggal (Admin, Supervisor, Analis)
testResultRouter.post(
  '/',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(createTestResultSchema),
  asyncHandler(TestResultController.createTestResult)
);

// GET /api/v1/test-results — Daftar riwayat hasil uji (Multi-tenant scoped)
testResultRouter.get(
  '/',
  validateRequest(testResultQuerySchema),
  asyncHandler(TestResultController.getTestResults)
);

// GET /api/v1/test-results/:id — Detail spesifik hasil uji
testResultRouter.get(
  '/:id',
  asyncHandler(TestResultController.getTestResultById)
);

// PATCH /api/v1/test-results/:id — Perbarui hasil uji (Admin, Supervisor, Analis)
testResultRouter.patch(
  '/:id',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(updateTestResultSchema),
  asyncHandler(TestResultController.updateTestResult)
);

// DELETE /api/v1/test-results/:id — Hapus hasil uji (Admin, Supervisor)
testResultRouter.delete(
  '/:id',
  authorize('admin', 'supervisor'),
  asyncHandler(TestResultController.deleteTestResult)
);
