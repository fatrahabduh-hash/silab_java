import { Router } from 'express';
import { SubmissionController } from './submission.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import {
  createSubmissionSchema,
  updateSubmissionStatusSchema,
  convertSubmissionSchema,
  querySubmissionSchema,
} from './submission.validation.js';

export const submissionRouter = Router();

// Seluruh rute membutuhkan otentikasi JWT
submissionRouter.use(authenticate);

// GET /api/v1/submissions/stats — Ringkasan statistik permohonan sampel
submissionRouter.get(
  '/stats',
  authorize('admin', 'supervisor'),
  asyncHandler(SubmissionController.getStats)
);

// GET /api/v1/submissions — Daftar permohonan sampel
submissionRouter.get(
  '/',
  validateRequest(querySubmissionSchema),
  asyncHandler(SubmissionController.getSubmissionList)
);

// GET /api/v1/submissions/:id — Detail permohonan sampel
submissionRouter.get('/:id', asyncHandler(SubmissionController.getSubmissionById));

// POST /api/v1/submissions — Registrasi permohonan sampel baru (SSF)
submissionRouter.post(
  '/',
  validateRequest(createSubmissionSchema),
  asyncHandler(SubmissionController.createSubmission)
);

// PATCH /api/v1/submissions/:id/status — Verifikasi & update status permohonan
submissionRouter.patch(
  '/:id/status',
  authorize('admin', 'supervisor', 'analis'),
  validateRequest(updateSubmissionStatusSchema),
  asyncHandler(SubmissionController.updateStatus)
);

// POST /api/v1/submissions/:id/convert — Konversi submission menjadi Batch Penerimaan Sampel
submissionRouter.post(
  '/:id/convert',
  authorize('admin', 'supervisor'),
  validateRequest(convertSubmissionSchema),
  asyncHandler(SubmissionController.convertToSampleReceipt)
);

// DELETE /api/v1/submissions/:id — Hapus permohonan (draft / pending)
submissionRouter.delete(
  '/:id',
  authorize('admin', 'supervisor'),
  asyncHandler(SubmissionController.deleteSubmission)
);
