import { Request, Response } from 'express';
import { TariffService } from './tariff.service.js';
import { ApiResponse } from '../../common/utils/api-response.js';
import { AppError } from '../../common/errors/app-error.js';

export class TariffController {
  static async getTariffList(req: Request, res: Response): Promise<Response> {
    const result = await TariffService.getTariffList(req.query as any);
    return ApiResponse.success(
      res,
      'Daftar tarif pengujian berhasil diambil',
      result.data,
      200,
      { pagination: result.meta }
    );
  }

  static async getTariffById(req: Request, res: Response): Promise<Response> {
    const id = Number(req.params.id);
    const item = await TariffService.getTariffById(id);
    return ApiResponse.success(res, 'Detail tarif pengujian berhasil diambil', item);
  }

  static async createTariff(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const result = await TariffService.createTariff(req.body, req.user);
    return ApiResponse.success(
      res,
      `Tarif '${result.nama}' berhasil didaftarkan`,
      result,
      201
    );
  }

  static async updateTariff(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const result = await TariffService.updateTariff(id, req.body, req.user);
    return ApiResponse.success(
      res,
      `Tarif '${result.nama}' berhasil diperbarui`,
      result
    );
  }

  static async deleteTariff(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const result = await TariffService.deleteTariff(id, req.user);
    return ApiResponse.success(
      res,
      result.deleted ? `Tarif '${result.nama}' berhasil dihapus` : result.message || 'Tarif berhasil diproses',
      result
    );
  }
}
