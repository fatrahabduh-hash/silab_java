import { Router } from 'express';
import { InvoiceController } from './invoice.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
  queryInvoiceSchema,
} from './invoice.validation.js';

export const invoiceRouter = Router();

// Seluruh rute Invoice mewajibkan otentikasi JWT
invoiceRouter.use(authenticate);

// GET /api/v1/invoices/stats — Statistik ringkasan keuangan (sebelum /:id)
invoiceRouter.get(
  '/stats',
  authorize('admin', 'supervisor'),
  asyncHandler(InvoiceController.getStats)
);

// GET /api/v1/invoices — Daftar invoice
invoiceRouter.get(
  '/',
  validateRequest(queryInvoiceSchema),
  asyncHandler(InvoiceController.getInvoiceList)
);

// GET /api/v1/invoices/:id — Detail invoice
invoiceRouter.get('/:id', asyncHandler(InvoiceController.getInvoiceById));

// POST /api/v1/invoices — Terbitkan invoice baru (Admin & Supervisor)
invoiceRouter.post(
  '/',
  authorize('admin', 'supervisor'),
  validateRequest(createInvoiceSchema),
  asyncHandler(InvoiceController.createInvoice)
);

// PUT /api/v1/invoices/:id — Perbarui invoice
invoiceRouter.put(
  '/:id',
  authorize('admin', 'supervisor'),
  validateRequest(updateInvoiceSchema),
  asyncHandler(InvoiceController.updateInvoice)
);

// PATCH /api/v1/invoices/:id/status — Perbarui status invoice (diterbitkan, lunas, dibatalkan)
invoiceRouter.patch(
  '/:id/status',
  authorize('admin', 'supervisor'),
  validateRequest(updateInvoiceStatusSchema),
  asyncHandler(InvoiceController.updateStatus)
);

// DELETE /api/v1/invoices/:id — Hapus invoice draft / dibatalkan
invoiceRouter.delete(
  '/:id',
  authorize('admin', 'supervisor'),
  asyncHandler(InvoiceController.deleteInvoice)
);
