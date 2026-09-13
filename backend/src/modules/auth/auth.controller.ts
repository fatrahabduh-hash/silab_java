import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { ApiResponse } from '../../common/utils/api-response.js';
import { AppError } from '../../common/errors/app-error.js';

export class AuthController {
  static async login(req: Request, res: Response): Promise<Response> {
    // req.ip sudah aman jika trust proxy diaktifkan di Express
    const clientIp = req.ip || req.socket.remoteAddress;

    const result = await AuthService.login(req.body, clientIp);
    return ApiResponse.success(res, 'Autentikasi berhasil', result, 200);
  }

  static async refresh(req: Request, res: Response): Promise<Response> {
    const result = await AuthService.refreshTokens(req.body);
    return ApiResponse.success(res, 'Pembaruan token berhasil', result, 200);
  }

  static async logout(req: Request, res: Response): Promise<Response> {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    const refreshToken = req.body?.refreshToken;

    await AuthService.logout(accessToken, refreshToken, req.user?.sub);
    return ApiResponse.success(res, 'Logout berhasil, sesi telah diakhiri', null, 200);
  }

  static async me(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw AppError.unauthorized('Sesi otentikasi tidak ditemukan');
    }

    const userProfile = await AuthService.getCurrentUser(req.user.sub);
    return ApiResponse.success(res, 'Data pengguna aktif berhasil diambil', userProfile, 200);
  }
}
