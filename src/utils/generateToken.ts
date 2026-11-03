import jwt, { SignOptions } from 'jsonwebtoken';
import { Response, CookieOptions } from 'express';
import { env } from '../config/environment';

export interface TokenPayload {
  id: string;
  username: string;
  email: string;
  role: string;
}

export const generateToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
};

export const getAuthCookieOptions = (): CookieOptions => {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    path: '/',
  };
};

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie('cst_admin_token', token, getAuthCookieOptions());
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie('cst_admin_token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });
};

