import { Request, Response } from 'express';
import { InvoiceService } from './invoice.service.js';
import { ApiResponse } from '../../common/utils/api-response.js';
import { AppError } from '../../common/errors/app-error.js';

export class InvoiceController {
  static async getInvoiceList(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const result = await InvoiceService.getInvoiceList(req.query as any, req.user);
    return ApiResponse.success(
      res,
      'Daftar invoice berhasil diambil',
      result.data,
      200,
      { pagination: result.meta }
    );
  }

  static async getStats(req: Request, res: Response): Promise<Response> {
    const stats = await InvoiceService.getStats();
    return ApiResponse.success(res, 'Statistik ringkasan keuangan dan invoice berhasil dimuat', stats);
  }

  static async getInvoiceById(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const item = await InvoiceService.getInvoiceById(id, req.user);
    return ApiResponse.success(res, 'Detail invoice berhasil diambil', item);
  }

  static async createInvoice(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const result = await InvoiceService.createInvoice(req.body, req.user);
    return ApiResponse.success(
      res,
      `Invoice ${result.nomorInvoice} berhasil dibuat untuk ${result.klien}`,
      result,
      201
    );
  }

  static async updateInvoice(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const result = await InvoiceService.updateInvoice(id, req.body, req.user);
    return ApiResponse.success(
      res,
      `Invoice ${result.nomorInvoice} berhasil diperbarui`,
      result
    );
  }

  static async updateStatus(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const result = await InvoiceService.updateStatus(id, req.body, req.user);
    return ApiResponse.success(
      res,
      `Status invoice ${result.nomorInvoice} berhasil diubah menjadi '${result.status}'`,
      result
    );
  }

  static async deleteInvoice(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const result = await InvoiceService.deleteInvoice(id, req.user);
    return ApiResponse.success(
      res,
      `Invoice ${result.nomorInvoice} berhasil dihapus dari sistem`,
      result
    );
  }
}
