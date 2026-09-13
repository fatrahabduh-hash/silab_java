import { Request, Response } from 'express';
import { ReagentService } from './reagent.service.js';
import { ApiResponse } from '../../common/utils/api-response.js';
import { AppError } from '../../common/errors/app-error.js';

export class ReagentController {
  /**
   * GET /api/v1/reagents
   * Daftar bahan kimia dengan filter dan pagination
   */
  static async getReagentList(req: Request, res: Response): Promise<Response> {
    const result = await ReagentService.getReagentList(req.query as any);
    return ApiResponse.success(
      res,
      'Data inventaris bahan kimia berhasil diambil',
      result.data,
      200,
      { pagination: result.meta }
    );
  }

  /**
   * GET /api/v1/reagents/stats
   * Metrik statistik inventaris bahan kimia
   */
  static async getStats(req: Request, res: Response): Promise<Response> {
    const stats = await ReagentService.getStats();
    return ApiResponse.success(res, 'Statistik inventaris bahan kimia berhasil dimuat', stats);
  }

  /**
   * GET /api/v1/reagents/:id
   * Detail bahan kimia
   */
  static async getReagentById(req: Request, res: Response): Promise<Response> {
    const id = Number(req.params.id);
    const item = await ReagentService.getReagentById(id);
    return ApiResponse.success(res, 'Detail bahan kimia berhasil diambil', item);
  }

  /**
   * POST /api/v1/reagents
   * Registrasi bahan kimia baru
   */
  static async createReagent(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const result = await ReagentService.createReagent(req.body, req.user);
    return ApiResponse.success(
      res,
      `Bahan kimia '${result.nama}' (${result.kodeBahan}) berhasil didaftarkan`,
      result,
      201
    );
  }

  /**
   * PUT /api/v1/reagents/:id
   * Perbarui informasi bahan kimia
   */
  static async updateReagent(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const result = await ReagentService.updateReagent(id, req.body, req.user);
    return ApiResponse.success(
      res,
      `Bahan kimia '${result.nama}' (${result.kodeBahan}) berhasil diperbarui`,
      result
    );
  }

  /**
   * POST /api/v1/reagents/:id/stock-adjust
   * Penyesuaian stok bahan kimia (masuk, keluar, opname)
   */
  static async adjustStock(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const result = await ReagentService.adjustStock(id, req.body, req.user);
    const msg = `Mutasi stok '${result.jenisMutasi}' bahan ${result.kodeBahan} berhasil (${result.stokSebelumnya} -> ${result.stokSekarang} ${result.satuan})`;
    return ApiResponse.success(res, msg, result);
  }

  /**
   * DELETE /api/v1/reagents/:id
   * Hapus bahan kimia
   */
  static async deleteReagent(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const result = await ReagentService.deleteReagent(id, req.user);
    return ApiResponse.success(
      res,
      `Bahan kimia dengan kode '${result.kodeBahan}' berhasil dihapus dari sistem`,
      result
    );
  }
}
