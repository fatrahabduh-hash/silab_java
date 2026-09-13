import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface AppEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  ALLOW_LEGACY_PLAINTEXT: boolean;
}

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`[Config Error] Environment variable '${key}' is mandatory.`);
  }
  return value;
};

const jwtSecret = getEnv('JWT_SECRET');
const jwtRefreshSecret = getEnv('JWT_REFRESH_SECRET');

if (jwtSecret === jwtRefreshSecret) {
  throw new Error('[Config Error] JWT_SECRET and JWT_REFRESH_SECRET must be strictly distinct keys.');
}

if (jwtSecret.length < 32 || jwtRefreshSecret.length < 32) {
  throw new Error('[Config Error] JWT_SECRET and JWT_REFRESH_SECRET must be at least 32 characters long for security.');
}

export const ENV: AppEnv = {
  NODE_ENV: (process.env.NODE_ENV as AppEnv['NODE_ENV']) || 'development',
  PORT: parseInt(getEnv('PORT', '5000'), 10),
  DATABASE_URL: getEnv('DATABASE_URL'),
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '1h'),
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  JWT_REFRESH_EXPIRES_IN: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  CORS_ORIGIN: getEnv('CORS_ORIGIN', 'http://localhost:8000,http://localhost:3000'),
  ALLOW_LEGACY_PLAINTEXT: process.env.ALLOW_LEGACY_PLAINTEXT === 'true',
};
