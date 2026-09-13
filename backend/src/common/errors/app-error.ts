export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: any): AppError {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'Akses ditolak: Autentikasi diperlukan', code = 'UNAUTHORIZED'): AppError {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Akses ditolak: Anda tidak memiliki izin untuk tindakan ini', code = 'FORBIDDEN'): AppError {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Sumber daya tidak ditemukan', code = 'NOT_FOUND'): AppError {
    return new AppError(message, 404, code);
  }

  static conflict(message: string, code = 'CONFLICT'): AppError {
    return new AppError(message, 409, code);
  }

  static unprocessable(message: string, details?: any): AppError {
    return new AppError(message, 422, 'UNPROCESSABLE_ENTITY', details);
  }
}
