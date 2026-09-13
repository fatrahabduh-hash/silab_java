import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ENV } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { sampleRouter } from './modules/sample/sample.routes.js';
import { xrfRouter } from './modules/xrf/xrf.routes.js';
import { workOrderRouter } from './modules/work-order/work-order.routes.js';
import { preparationRouter } from './modules/preparation/preparation.routes.js';
import { testResultRouter } from './modules/test-result/test-result.routes.js';
import { qcRouter } from './modules/qc/qc.routes.js';
import { equipmentRouter } from './modules/equipment/equipment.routes.js';
import { reagentRouter } from './modules/reagent/reagent.routes.js';
import { tariffRouter } from './modules/tariff/tariff.routes.js';
import { invoiceRouter } from './modules/invoice/invoice.routes.js';
import { submissionRouter } from './modules/submission/submission.routes.js';
import { clientPortalRouter } from './modules/client-portal/client-portal.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { ApiResponse } from './common/utils/api-response.js';

export const app: Express = express();

// 1. Trusted Proxy Configuration
app.set('trust proxy', 1);

// 2. Security Headers & CORS Allowlist
app.use(helmet());

const allowedOrigins = ENV.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (seperti curl, mobile app, postman) atau dalam allowlist
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Akses CORS ditolak untuk origin: ${origin}`));
    },
    credentials: true,
  })
);

// 3. Body Parsers with JSON Syntax Error Interceptor
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware penangkap error parsing JSON yang tidak valid (malformed JSON)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return ApiResponse.error(res, 'Format payload JSON tidak valid', 400, 'MALFORMED_JSON');
  }
  next(err);
});

// 4. Rate Limiting untuk Endpoint Autentikasi (Login & Refresh)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 30, // Maksimal 30 percobaan per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Terlalu banyak percobaan autentikasi dari IP ini. Silakan coba lagi setelah 15 menit.',
    meta: {
      timestamp: new Date().toISOString(),
    },
  },
});

// 5. Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  return ApiResponse.success(res, 'AISPEKTRA LIMS Backend Engine is operational', {
    uptime: process.uptime(),
    environment: ENV.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// 6. Versioned API Routing
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/samples', sampleRouter);
app.use('/api/v1/xrf', xrfRouter);
app.use('/api/v1/work-orders', workOrderRouter);
app.use('/api/v1/preparations', preparationRouter);
app.use('/api/v1/test-results', testResultRouter);
app.use('/api/v1/qc', qcRouter);
app.use('/api/v1/equipment', equipmentRouter);
app.use('/api/v1/reagents', reagentRouter);
app.use('/api/v1/tariffs', tariffRouter);
app.use('/api/v1/invoices', invoiceRouter);
app.use('/api/v1/submissions', submissionRouter);
app.use('/api/v1/client-portal', clientPortalRouter);

// 7. Global 404 & Error Handler
app.use(notFoundHandler);
app.use(errorHandler);
