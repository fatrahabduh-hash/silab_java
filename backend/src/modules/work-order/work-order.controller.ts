import { Request, Response } from 'express';
import { WorkOrderService } from './work-order.service.js';
import { ApiResponse } from '../../common/utils/api-response.js';
import { AppError } from '../../common/errors/app-error.js';

export class WorkOrderController {
  /**
   * POST /api/v1/work-orders
   * Penerbitan Work Order baru
   */
  static async createWorkOrder(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const result = await WorkOrderService.createWorkOrder(req.body, req.user);
    return ApiResponse.success(res, 'Work Order berhasil diterbitkan', result, 201);
  }

  /**
   * GET /api/v1/work-orders
   * Daftar Work Order
   */
  static async getWorkOrders(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const result = await WorkOrderService.getWorkOrders(req.query, req.user);
    return ApiResponse.success(res, 'Daftar Work Order berhasil diambil', result, 200);
  }

  /**
   * GET /api/v1/work-orders/available-samples
   * Daftar sampel yang siap dialokasikan ke WO baru
   */
  static async getAvailableSamples(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const result = await WorkOrderService.getAvailableSamples(req.user);
    return ApiResponse.success(res, 'Daftar sampel yang tersedia berhasil diambil', result, 200);
  }

  /**
   * GET /api/v1/work-orders/:id
   * Detail Work Order
   */
  static async getWorkOrderById(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const id = Number(req.params.id);
    const result = await WorkOrderService.getWorkOrderById(id, req.user);
    return ApiResponse.success(res, 'Detail Work Order berhasil diambil', result, 200);
  }

  /**
   * PATCH /api/v1/work-orders/:id/status
   * Perbarui status Work Order (Aktivasi, Selesaikan, Batalkan)
   */
  static async updateStatus(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }

    const id = Number(req.params.id);
    const result = await WorkOrderService.updateStatus(id, req.body, req.user);
    return ApiResponse.success(res, 'Status Work Order berhasil diperbarui', result, 200);
  }
}
