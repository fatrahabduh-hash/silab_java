import { Router } from 'express';
import { ClientPortalController } from './client-portal.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';

export const clientPortalRouter = Router();

// GET /api/v1/client-portal/track/:kodeAkses — Tracking publik tanpa login
clientPortalRouter.get(
  '/track/:kodeAkses',
  asyncHandler(ClientPortalController.trackByAccessCode)
);

// Rute di bawah ini mewajibkan otentikasi login
clientPortalRouter.use(authenticate);

// GET /api/v1/client-portal/my-submissions — Riwayat permohonan sampel milik klien
clientPortalRouter.get(
  '/my-submissions',
  asyncHandler(ClientPortalController.getMySubmissions)
);

// GET /api/v1/client-portal/my-samples — Status real-time sampel klien
clientPortalRouter.get(
  '/my-samples',
  asyncHandler(ClientPortalController.getMySamples)
);

// GET /api/v1/client-portal/access-keys — Manajemen kunci akses klien (Admin & Supervisor)
clientPortalRouter.get(
  '/access-keys',
  authorize('admin', 'supervisor'),
  asyncHandler(ClientPortalController.getAccessKeys)
);
