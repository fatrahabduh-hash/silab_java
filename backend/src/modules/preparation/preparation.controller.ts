import { Request, Response } from 'express';
import { PreparationService } from './preparation.service.js';
import { ApiResponse } from '../../common/utils/api-response.js';
import { AppError } from '../../common/errors/app-error.js';

export class PreparationController {
  /**
   * POST /api/v1/preparations
   * Mencatat data preparasi sampel baru (single / batch WO)
   */
  static async createPreparation(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const result = await PreparationService.createPreparation(req.body, req.user);
    const message =
      Array.isArray(result) && result.length > 1
        ? `Catatan preparasi berhasil disimpan untuk ${result.length} sampel dalam batch`
        : 'Catatan preparasi berhasil disimpan';

    return ApiResponse.success(res, message, result, 201);
  }

  /**
   * GET /api/v1/preparations
   * Daftar riwayat preparasi sampel dengan pagination dan filter
   */
  static async getPreparations(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const result = await PreparationService.getPreparations(req.query, req.user);
    return ApiResponse.success(res, 'Daftar riwayat preparasi sampel berhasil diambil', result, 200);
  }

  /**
   * GET /api/v1/preparations/reagents
   * Daftar reagen kimia siap pakai dari inventaris
   */
  static async getAvailableReagents(req: Request, res: Response): Promise<Response> {
    const result = await PreparationService.getAvailableReagents();
    return ApiResponse.success(res, 'Daftar reagen kimia berhasil diambil', result, 200);
  }

  /**
   * GET /api/v1/preparations/:id
   * Detail spesifik preparasi sampel
   */
  static async getPreparationById(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const id = Number(req.params.id);
    const result = await PreparationService.getPreparationById(id, req.user);
    return ApiResponse.success(res, 'Detail preparasi sampel berhasil diambil', result, 200);
  }

  /**
   * PATCH /api/v1/preparations/:id
   * Memperbarui catatan teknis preparasi
   */
  static async updatePreparation(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const id = Number(req.params.id);
    const result = await PreparationService.updatePreparation(id, req.body, req.user);
    return ApiResponse.success(res, 'Catatan preparasi berhasil diperbarui', result, 200);
  }

  /**
   * DELETE /api/v1/preparations/:id
   * Menghapus catatan preparasi sampel
   */
  static async deletePreparation(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const id = Number(req.params.id);
    await PreparationService.deletePreparation(id, req.user);
    return ApiResponse.success(res, `Catatan preparasi ID #${id} berhasil dihapus`, null, 200);
  }
}
