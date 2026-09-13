import { Request, Response } from 'express';
import { ClientPortalService } from './client-portal.service.js';
import { ApiResponse } from '../../common/utils/api-response.js';
import { AppError } from '../../common/errors/app-error.js';

export class ClientPortalController {
  /**
   * GET /api/v1/client-portal/track/:kodeAkses
   * Pelacakan status pengujian secara publik via kode akses atau nomor SSF
   */
  static async trackByAccessCode(req: Request, res: Response): Promise<Response> {
    const kodeAkses = req.params.kodeAkses;
    const result = await ClientPortalService.trackByAccessCode(kodeAkses);
    return ApiResponse.success(res, `Informasi pelacakan untuk '${kodeAkses}' berhasil dimuat`, result);
  }

  /**
   * GET /api/v1/client-portal/my-submissions
   * Daftar permohonan sampel milik klien yang login
   */
  static async getMySubmissions(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const submissions = await ClientPortalService.getMySubmissions(req.user);
    return ApiResponse.success(res, 'Daftar permohonan sampel Anda berhasil dimuat', submissions);
  }

  /**
   * GET /api/v1/client-portal/my-samples
   * Status pengujian seluruh sampel milik klien secara real-time
   */
  static async getMySamples(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const samples = await ClientPortalService.getMySamples(req.user);
    return ApiResponse.success(res, 'Status pengujian sampel Anda berhasil dimuat', samples);
  }

  /**
   * GET /api/v1/client-portal/access-keys
   * Admin / Supervisor mengambil daftar seluruh kunci akses
   */
  static async getAccessKeys(req: Request, res: Response): Promise<Response> {
    const keys = await ClientPortalService.getAccessKeys();
    return ApiResponse.success(res, 'Daftar kunci akses klien berhasil dimuat', keys);
  }
}
