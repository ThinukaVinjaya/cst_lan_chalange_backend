import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface Environment {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  FRONTEND_URL: string;
  ADMIN_USERNAME: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
}

const getEnv = (): Environment => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('FATAL: MONGODB_URI environment variable is missing.');
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'cst_lan_challenge_2026_default_secure_secret_key';

  return {
    PORT: parseInt(process.env.PORT || '5000', 10),
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    MONGODB_URI,
    JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@cst.uwu.ac.lk',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin12345',
  };
};

export const env = getEnv();

