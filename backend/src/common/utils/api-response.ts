import { Response } from 'express';

export interface ApiResponseMeta {
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  [key: string]: any;
}

export interface ApiSuccessPayload<T> {
  status: 'success';
  message: string;
  data: T;
  meta: ApiResponseMeta;
}

export interface ApiErrorPayload {
  status: 'fail' | 'error';
  code: string;
  message: string;
  errors?: any;
  meta: ApiResponseMeta;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    message: string,
    data: T = null as unknown as T,
    statusCode = 200,
    metaExtensions: Record<string, any> = {}
  ): Response {
    const payload: ApiSuccessPayload<T> = {
      status: 'success',
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...metaExtensions,
      },
    };
    return res.status(statusCode).json(payload);
  }

  static error(
    res: Response,
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    errors: any = null
  ): Response {
    const payload: ApiErrorPayload = {
      status: statusCode >= 500 ? 'error' : 'fail',
      code,
      message,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
    if (errors) {
      payload.errors = errors;
    }
    return res.status(statusCode).json(payload);
  }
}
