import { Router } from 'express';
import { XrfController } from './xrf.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import {
  xrfIngestionSchema,
  xrfAdminAuthSchema,
  xrfQuerySchema,
  linkSampleSchema,
} from './xrf.validation.js';

export const xrfRouter = Router();

/**
 * Endpoint Publik / Alat XRF:
 */

// GET /api/v1/xrf/health — Status receiver & info service
xrfRouter.get('/health', asyncHandler(XrfController.health));

// POST /api/v1/xrf/receive — Ingestion data spektrum XRF Explorer 7000 / Android
xrfRouter.post(
  '/receive',
  validateRequest(xrfIngestionSchema),
  asyncHandler(XrfController.receive)
);

// POST /api/v1/xrf/auth — Autentikasi Admin/Supervisor untuk unlock alat
xrfRouter.post(
  '/auth',
  validateRequest(xrfAdminAuthSchema),
  asyncHandler(XrfController.auth)
);

/**
 * Endpoint Terproteksi JWT (Manajemen Dashboard Lab):
 */

// GET /api/v1/xrf/devices — Status perangkat XRF & heartbeat
xrfRouter.get(
  '/devices',
  authenticate,
  authorize('admin', 'supervisor', 'analis'),
  asyncHandler(XrfController.getDevices)
);

// GET /api/v1/xrf/measurements — Daftar riwayat hasil pengukuran XRF
xrfRouter.get(
  '/measurements',
  authenticate,
  validateRequest(xrfQuerySchema),
  asyncHandler(XrfController.getMeasurements)
);

// GET /api/v1/xrf/measurements/:id — Detail pengukuran dan breakdown unsur
xrfRouter.get(
  '/measurements/:id',
  authenticate,
  asyncHandler(XrfController.getMeasurementById)
);

// POST /api/v1/xrf/measurements/:id/link — Tautkan pengukuran ke sampel laboratorium
xrfRouter.post(
  '/measurements/:id/link',
  authenticate,
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(linkSampleSchema),
  asyncHandler(XrfController.linkSample)
);
