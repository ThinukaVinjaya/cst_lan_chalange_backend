import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { verifyToken, TokenPayload } from '../utils/generateToken';
import { Admin, IAdmin } from '../models/Admin';
import { ApiError } from '../utils/ApiError';

export interface AuthenticatedRequest extends Request {
  admin?: IAdmin;
  tokenPayload?: TokenPayload;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies.cst_admin_token) {
      token = req.cookies.cst_admin_token;
    }

    // 2. Check Authorization Bearer header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(ApiError.unauthorized('Authentication required. Please log in.'));
    }

    let payload: TokenPayload;
    try {
      payload = verifyToken(token);
    } catch (err: any) {
      return next(ApiError.unauthorized('Session expired or invalid token. Please log in again.'));
    }

    if (payload.id === 'admin-fallback-id' || mongoose.connection.readyState !== 1) {
      req.admin = {
        _id: payload.id as any,
        username: payload.username,
        email: payload.email,
        role: payload.role as any,
        isActive: true,
      } as any;
      req.tokenPayload = payload;
      return next();
    }

    const admin = await Admin.findById(payload.id);
    if (!admin) {
      return next(ApiError.unauthorized('Administrator account not found.'));
    }

    if (!admin.isActive) {
      return next(ApiError.forbidden('Administrator account is deactivated. Contact tournament chair.'));
    }

    req.admin = admin;
    req.tokenPayload = payload;
    next();
  } catch (error) {
    next(error);
  }
};
