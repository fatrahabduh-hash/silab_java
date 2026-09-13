import { Request, Response } from 'express';
import { SubmissionService } from './submission.service.js';
import { ApiResponse } from '../../common/utils/api-response.js';
import { AppError } from '../../common/errors/app-error.js';

export class SubmissionController {
  static async getSubmissionList(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const result = await SubmissionService.getSubmissionList(req.query as any, req.user);
    return ApiResponse.success(
      res,
      'Daftar permohonan sampel berhasil diambil',
      result.data,
      200,
      { pagination: result.meta }
    );
  }

  static async getStats(req: Request, res: Response): Promise<Response> {
    const stats = await SubmissionService.getStats();
    return ApiResponse.success(res, 'Statistik permohonan sampel berhasil dimuat', stats);
  }

  static async getSubmissionById(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const item = await SubmissionService.getSubmissionById(id, req.user);
    return ApiResponse.success(res, 'Detail permohonan sampel berhasil diambil', item);
  }

  static async createSubmission(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const result = await SubmissionService.createSubmission(req.body, req.user);
    return ApiResponse.success(
      res,
      `Permohonan sampel ${result.nomorSubmission} berhasil dikirim [Kode Akses: ${result.kodeAkses}]`,
      result,
      201
    );
  }

  static async updateStatus(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const result = await SubmissionService.updateStatus(id, req.body, req.user);
    return ApiResponse.success(
      res,
      `Status permohonan ${result.nomorSubmission} berhasil diubah menjadi '${result.status}'`,
      result
    );
  }

  static async convertToSampleReceipt(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const result = await SubmissionService.convertToSampleReceipt(id, req.body, req.user);
    return ApiResponse.success(
      res,
      `Permohonan ${result.nomorSubmission} berhasil dikonversi menjadi Penerimaan Sampel ${result.nomorPenerimaan}`,
      result,
      201
    );
  }

  static async deleteSubmission(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi pengguna tidak valid');
    }
    const id = Number(req.params.id);
    const result = await SubmissionService.deleteSubmission(id, req.user);
    return ApiResponse.success(
      res,
      `Permohonan sampel ${result.nomorSubmission} berhasil dihapus`,
      result
    );
  }
}
