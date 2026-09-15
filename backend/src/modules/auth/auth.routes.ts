import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { loginSchema, refreshTokenSchema } from './auth.validation.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';

export const authRouter = Router();

/**
 * POST /api/v1/auth/login
 * Public - Login kredensial pengguna
 */
authRouter.post('/login', validateRequest(loginSchema), asyncHandler(AuthController.login));

/**
 * POST /api/v1/auth/refresh
 * Public - Pembaruan JWT token
 */
authRouter.post('/refresh', validateRequest(refreshTokenSchema), asyncHandler(AuthController.refresh));

/**
 * POST /api/v1/auth/logout
 * Protected - Pencabutan sesi dan token
 */
authRouter.post('/logout', authenticate, asyncHandler(AuthController.logout));

/**
 * GET /api/v1/auth/me
 * Protected - Mengambil profil user yang sedang aktif
 */
authRouter.get('/me', authenticate, asyncHandler(AuthController.me));

/**
 * GET /api/v1/auth/users
 * Protected - Mengambil daftar seluruh pengguna
 */
authRouter.get('/users', authenticate, authorize('admin', 'supervisor'), asyncHandler(AuthController.getUsers));

/**
 * POST /api/v1/auth/users
 * Protected - Mendaftarkan pengguna baru (Admin)
 */
authRouter.post('/users', authenticate, authorize('admin'), asyncHandler(AuthController.createUser));

