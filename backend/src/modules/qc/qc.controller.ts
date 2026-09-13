import { Request, Response } from 'express';
import { QcService } from './qc.service.js';
import { ApiResponse } from '../../common/utils/api-response.js';
import { AppError } from '../../common/errors/app-error.js';

export class QcController {
  /**
   * POST /api/v1/qc
   * Input data pengujian QC analitis baru
   */
  static async createQc(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const result = await QcService.createQc(req.body, req.user);
    const msg = `Data QC (${result.tipeQc}) berhasil disimpan [Flag: ${result.flag?.toUpperCase()}]`;
    return ApiResponse.success(res, msg, result, 201);
  }

  /**
   * POST /api/v1/qc/standard
   * Pendaftaran acuan Certified Reference Material (CRM)
   */
  static async createStandardSample(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const result = await QcService.createStandardSample(req.body, req.user);
    return ApiResponse.success(res, 'Data acuan standar CRM berhasil didaftarkan', result, 201);
  }

  /**
   * PATCH /api/v1/qc/:id/review
   * Review dan validasi mutu oleh Supervisor atau Admin
   */
  static async reviewQc(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const id = Number(req.params.id);
    const result = await QcService.reviewQc(id, req.body, req.user);
    return ApiResponse.success(
      res,
      `Hasil QC berhasil divalidasi: ${result.statusQc?.toUpperCase()}`,
      result,
      200
    );
  }

  /**
   * GET /api/v1/qc
   * Riwayat data QC analitis
   */
  static async getQcRecords(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const result = await QcService.getQcRecords(req.query, req.user);
    return ApiResponse.success(res, 'Daftar data QC analitis berhasil diambil', result, 200);
  }

  /**
   * GET /api/v1/qc/stats
   * Statistik ringkasan mutu QC untuk dasbor lab
   */
  static async getQcStatistics(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const result = await QcService.getQcStatistics(req.user);
    return ApiResponse.success(res, 'Statistik ringkasan mutu QC berhasil diambil', result, 200);
  }

  /**
   * GET /api/v1/qc/:id
   * Detail spesifik catatan QC
   */
  static async getQcById(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const id = Number(req.params.id);
    const result = await QcService.getQcById(id, req.user);
    return ApiResponse.success(res, 'Detail data QC berhasil diambil', result, 200);
  }

  /**
   * DELETE /api/v1/qc/:id
   * Menghapus catatan QC
   */
  static async deleteQc(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const id = Number(req.params.id);
    await QcService.deleteQc(id, req.user);
    return ApiResponse.success(res, `Catatan QC ID #${id} berhasil dihapus`, null, 200);
  }
}
