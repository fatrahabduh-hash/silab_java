import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/errors/app-error.js';
import { JwtUtil } from '../modules/auth/utils/jwt.util.js';
import { prisma } from '../config/database.js';
import { UserRole } from '../modules/auth/auth.types.js';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Akses ditolak: Bearer Token tidak ditemukan di header permintaan'));
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(AppError.unauthorized('Akses ditolak: Format Bearer token tidak valid'));
  }

  try {
    const decoded = JwtUtil.verifyAccessToken(token);

    // Verifikasi real-time ke database: pastikan user masih ada & akun masih aktif
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, username: true, role: true, status: true },
    });

    if (!user || user.status !== 'aktif') {
      return next(
        AppError.unauthorized('Sesi tidak valid: Akun pengguna tidak ditemukan atau telah dinonaktifkan', 'ACCOUNT_INACTIVE')
      );
    }

    // Pasang data user terkini ke request context
    req.user = {
      sub: user.id,
      username: user.username,
      role: user.role as UserRole,
      tokenType: 'access',
    };

    next();
  } catch (error: any) {
    next(error);
  }
}
