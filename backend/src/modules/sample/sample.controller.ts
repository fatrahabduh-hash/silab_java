import { Request, Response } from 'express';
import { SampleService } from './sample.service.js';
import { ApiResponse } from '../../common/utils/api-response.js';
import { AppError } from '../../common/errors/app-error.js';

export class SampleController {
  /**
   * POST /api/v1/samples/receipts
   * Buat pencatatan batch penerimaan sampel
   */
  static async createReceipt(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const receipt = await SampleService.createReceipt(req.body, req.user);
    return ApiResponse.success(res, 'Penerimaan batch sampel berhasil dicatat', receipt, 201);
  }

  /**
   * GET /api/v1/samples/receipts
   * Daftar batch penerimaan sampel
   */
  static async getReceipts(req: Request, res: Response): Promise<Response> {
    const result = await SampleService.getReceipts(req.query);
    return ApiResponse.success(res, 'Daftar penerimaan sampel berhasil diambil', result, 200);
  }

  /**
   * GET /api/v1/samples/receipts/:id
   * Detail batch penerimaan beserta seluruh sampelnya
   */
  static async getReceiptById(req: Request, res: Response): Promise<Response> {
    const id = Number(req.params.id);
    const receipt = await SampleService.getReceiptById(id);
    return ApiResponse.success(res, 'Detail penerimaan sampel berhasil diambil', receipt, 200);
  }

  /**
   * PATCH /api/v1/samples/receipts/:id/status
   * Perbarui status batch penerimaan sampel
   */
  static async updateReceiptStatus(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const id = Number(req.params.id);
    const updated = await SampleService.updateReceiptStatus(id, req.body, req.user);
    return ApiResponse.success(res, 'Status penerimaan sampel berhasil diperbarui', updated, 200);
  }

  /**
   * POST /api/v1/samples
   * Registrasi sampel satuan
   */
  static async createSample(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const sample = await SampleService.createSample(req.body, req.user);
    return ApiResponse.success(res, 'Registrasi sampel berhasil', sample, 201);
  }

  /**
   * GET /api/v1/samples
   * Ambil daftar sampel (dengan filter dan scoping role klien)
   */
  static async getSamples(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const result = await SampleService.getSamples(req.query, req.user);
    return ApiResponse.success(res, 'Daftar sampel laboratorium berhasil diambil', result, 200);
  }

  /**
   * GET /api/v1/samples/:id
   * Ambil detail spesifik sampel
   */
  static async getSampleById(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const id = Number(req.params.id);
    const sample = await SampleService.getSampleById(id, req.user);
    return ApiResponse.success(res, 'Detail data sampel berhasil diambil', sample, 200);
  }

  /**
   * PATCH /api/v1/samples/:id/status
   * Perbarui status tahapan sampel (State Machine & RBAC)
   */
  static async updateSampleStatus(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const id = Number(req.params.id);
    const updated = await SampleService.updateSampleStatus(id, req.body, req.user);
    return ApiResponse.success(res, 'Status pengujian sampel berhasil diperbarui', updated, 200);
  }
}
