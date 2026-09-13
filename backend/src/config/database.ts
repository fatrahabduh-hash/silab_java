import { PrismaClient } from '@prisma/client';
import { ENV } from './env.js';

declare global {
  // eslint-disable-next-line no-var
  var prismaInstance: PrismaClient | undefined;
}

export const prisma =
  global.prismaInstance ||
  new PrismaClient({
    log: ENV.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (ENV.NODE_ENV !== 'production') {
  global.prismaInstance = prisma;
}

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[Database] Connected securely to MySQL (AISPEKTRA LIMS)');
  } catch (error: any) {
    console.error('[Database Connection Error]:', error.message);
    process.exit(1);
  }
}
