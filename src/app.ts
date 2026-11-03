import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/environment';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import registrationRoutes from './routes/registrationRoutes';
import publicRoutes from './routes/publicRoutes';
import adminRoutes from './routes/adminRoutes';
import { ApiError } from './utils/ApiError';

export const createApp = (): Application => {
  const app = express();

  // 1. Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // Managed by Next.js frontend
    })
  );

  // 2. CORS Allowlist
  const allowedOrigins = [
    env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 3. Body Parsing & Cookies
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // 4. Health Check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'CST LAN Challenge 2026 CS2 Backend API',
      university: 'Uva Wellassa University of Sri Lanka',
    });
  });

  // 5. Mount API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/registrations', registrationRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/admin', adminRoutes);

  // 6. 404 Handler
  app.use('*', (req: Request, _res: Response, next) => {
    next(ApiError.notFound(`Endpoint not found: ${req.method} ${req.originalUrl}`));
  });

  // 7. Central Error Handler
  app.use(errorHandler);

  return app;
};

