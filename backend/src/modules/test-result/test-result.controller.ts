import { Request, Response } from 'express';
import { TestResultService } from './test-result.service.js';
import { ApiResponse } from '../../common/utils/api-response.js';
import { AppError } from '../../common/errors/app-error.js';

export class TestResultController {
  /**
   * POST /api/v1/test-results
   * Input hasil uji laboratorium tunggal
   */
  static async createTestResult(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const result = await TestResultService.createTestResult(req.body, req.user);
    return ApiResponse.success(res, 'Hasil uji laboratorium berhasil dicatat', result, 201);
  }

  /**
   * POST /api/v1/test-results/batch
   * Input hasil uji laboratorium batch multi-baris
   */
  static async createBatchTestResults(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const result = await TestResultService.createBatchTestResults(req.body, req.user);
    return ApiResponse.success(
      res,
      `${result.length} baris hasil uji laboratorium berhasil dicatat secara kolektif`,
      result,
      201
    );
  }

  /**
   * GET /api/v1/test-results
   * Daftar riwayat hasil uji laboratorium
   */
  static async getTestResults(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const result = await TestResultService.getTestResults(req.query, req.user);
    return ApiResponse.success(res, 'Daftar hasil pengujian berhasil diambil', result, 200);
  }

  /**
   * GET /api/v1/test-results/:id
   * Detail spesifik hasil uji
   */
  static async getTestResultById(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const id = Number(req.params.id);
    const result = await TestResultService.getTestResultById(id, req.user);
    return ApiResponse.success(res, 'Detail hasil uji berhasil diambil', result, 200);
  }

  /**
   * PATCH /api/v1/test-results/:id
   * Memperbarui hasil pengujian laboratorium
   */
  static async updateTestResult(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const id = Number(req.params.id);
    const result = await TestResultService.updateTestResult(id, req.body, req.user);
    return ApiResponse.success(res, 'Hasil pengujian berhasil diperbarui', result, 200);
  }

  /**
   * DELETE /api/v1/test-results/:id
   * Menghapus hasil uji laboratorium
   */
  static async deleteTestResult(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const id = Number(req.params.id);
    await TestResultService.deleteTestResult(id, req.user);
    return ApiResponse.success(res, `Hasil uji ID #${id} berhasil dihapus`, null, 200);
  }
}
