import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../common/errors/app-error.js';
import { ApiResponse } from '../common/utils/api-response.js';
import { Logger } from '../common/utils/logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): Response {
  Logger.error(`Unhandled request error on [${req.method}] ${req.originalUrl}`, err);

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return ApiResponse.error(res, 'Validasi input data gagal', 400, 'VALIDATION_ERROR', formattedErrors);
  }

  // 2. Custom Application Errors
  if (err instanceof AppError) {
    return ApiResponse.error(res, err.message, err.statusCode, err.code, err.details);
  }

  // 3. Prisma Known Request Errors
  if (err.code === 'P2002') {
    const target = err.meta?.target ? ` pada '${err.meta.target}'` : '';
    return ApiResponse.error(
      res,
      `Terjadi konflik data unik${target}`,
      409,
      'DUPLICATE_RESOURCE_ERROR'
    );
  }

  if (err.code === 'P2025') {
    return ApiResponse.error(res, 'Data relasi tidak ditemukan di database', 404, 'RECORD_NOT_FOUND');
  }

  // 4. Default Server Error
  return ApiResponse.error(
    res,
    process.env.NODE_ENV === 'production'
      ? 'Terjadi kesalahan sistem internal'
      : err.message || 'Internal Server Error',
    500,
    'INTERNAL_SERVER_ERROR'
  );
}

export function notFoundHandler(req: Request, res: Response): Response {
  return ApiResponse.error(
    res,
    `Rute endpoint '${req.method} ${req.originalUrl}' tidak ditemukan`,
    404,
    'ENDPOINT_NOT_FOUND'
  );
}
