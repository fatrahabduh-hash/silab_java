import { Request, Response } from 'express';
import { EquipmentService } from './equipment.service.js';
import { ApiResponse } from '../../common/utils/api-response.js';
import { AppError } from '../../common/errors/app-error.js';

export class EquipmentController {
  /**
   * GET /api/v1/equipment
   * Daftar peralatan laboratorium
   */
  static async getEquipmentList(req: Request, res: Response): Promise<Response> {
    const result = await EquipmentService.getEquipmentList(req.query as any);
    return ApiResponse.success(
      res,
      'Data inventaris peralatan berhasil diambil',
      result.data,
      200,
      { pagination: result.meta }
    );
  }

  /**
   * GET /api/v1/equipment/stats
   * Metrik statistik inventaris peralatan
   */
  static async getStats(req: Request, res: Response): Promise<Response> {
    const stats = await EquipmentService.getStats();
    return ApiResponse.success(res, 'Statistik peralatan laboratorium berhasil dimuat', stats);
  }

  /**
   * GET /api/v1/equipment/:id
   * Detail instrumen alat
   */
  static async getEquipmentById(req: Request, res: Response): Promise<Response> {
    const id = Number(req.params.id);
    const item = await EquipmentService.getEquipmentById(id);
    return ApiResponse.success(res, 'Detail peralatan berhasil diambil', item);
  }

  /**
   * POST /api/v1/equipment
   * Registrasi alat baru
   */
  static async createEquipment(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const result = await EquipmentService.createEquipment(req.body, req.user);
    return ApiResponse.success(
      res,
      `Peralatan '${result.nama}' (${result.kodeAlat}) berhasil didaftarkan`,
      result,
      201
    );
  }

  /**
   * PUT /api/v1/equipment/:id
   * Perbarui data spesifikasi alat
   */
  static async updateEquipment(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const result = await EquipmentService.updateEquipment(id, req.body, req.user);
    return ApiResponse.success(
      res,
      `Peralatan '${result.nama}' (${result.kodeAlat}) berhasil diperbarui`,
      result
    );
  }

  /**
   * PATCH /api/v1/equipment/:id/status
   * Perbarui kondisi operasional alat
   */
  static async updateStatus(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const result = await EquipmentService.updateStatus(id, req.body.status, req.user);
    return ApiResponse.success(
      res,
      `Status kondisi peralatan '${result.kodeAlat}' diubah menjadi '${result.status}'`,
      result
    );
  }

  /**
   * POST /api/v1/equipment/:id/log-usage
   * Tambah jam pemakaian operasional alat
   */
  static async logUsage(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const result = await EquipmentService.logUsage(id, req.body, req.user);
    return ApiResponse.success(
      res,
      `Jam operasional peralatan '${result.kodeAlat}' berhasil ditambahkan (Total: ${result.jamPakai} jam)`,
      result
    );
  }

  /**
   * DELETE /api/v1/equipment/:id
   * Hapus peralatan
   */
  static async deleteEquipment(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const result = await EquipmentService.deleteEquipment(id, req.user);
    return ApiResponse.success(
      res,
      `Peralatan dengan kode '${result.kodeAlat}' berhasil dihapus dari sistem`,
      result
    );
  }
}
