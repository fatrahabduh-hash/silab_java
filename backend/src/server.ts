import { app } from './app.js';
import { ENV } from './config/env.js';
import { connectDB, prisma } from './config/database.js';
import { Logger } from './common/utils/logger.js';

async function bootstrap(): Promise<void> {
  // 1. Inisialisasi koneksi database MySQL
  await connectDB();

  // 2. Jalankan HTTP Server
  const server = app.listen(ENV.PORT, () => {
    Logger.info(`🚀 AISPEKTRA / LabMineral Pro Backend berjalan di http://localhost:${ENV.PORT}`);
    Logger.info(`📡 Mode Lingkungan: ${ENV.NODE_ENV}`);
    Logger.info(`🔒 Auth Endpoint: http://localhost:${ENV.PORT}/api/v1/auth`);
  });

  // 3. Graceful Shutdown Handler
  const handleShutdown = async (signal: string) => {
    Logger.info(`[${signal}] Menerima sinyal terminasi. Memulai graceful shutdown...`);

    server.close(async () => {
      Logger.info('🛑 HTTP server telah ditutup untuk permintaan baru.');
      try {
        await prisma.$disconnect();
        Logger.info('🛑 Koneksi Prisma database telah diputus dengan aman.');
        process.exit(0);
      } catch (err: any) {
        Logger.error('❌ Terjadi kesalahan saat menutup koneksi database:', err);
        process.exit(1);
      }
    });

    // Paksa shutdown jika tidak selesai dalam 10 detik
    setTimeout(() => {
      Logger.error('⚠️ Shutdown timeout (10s) tercapai, memaksa penghentian proses.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  process.on('unhandledRejection', (reason: any) => {
    Logger.error('Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (error: Error) => {
    Logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

bootstrap();
