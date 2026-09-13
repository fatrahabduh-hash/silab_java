import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/errors/app-error.js';
import { UserRole } from '../modules/auth/auth.types.js';

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized('Pengguna belum terautentikasi');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw AppError.forbidden(
        `Akses ditolak: Peran '${req.user.role}' tidak memiliki otorisasi untuk mengakses sumber daya ini`
      );
    }

    next();
  };
}
