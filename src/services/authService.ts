import { Request } from 'express';
import mongoose from 'mongoose';
import { Admin, IAdmin } from '../models/Admin';
import { ApiError } from '../utils/ApiError';
import { generateToken } from '../utils/generateToken';
import { recordAudit } from './auditService';
import { env } from '../config/environment';

export interface LoginResult {
  token: string;
  admin: {
    id: string;
    username: string;
    email: string;
    role: string;
    lastLoginAt?: Date;
  };
}

export const loginAdmin = async (
  usernameOrEmail: string,
  passwordPlain: string,
  req?: Request
): Promise<LoginResult> => {
  // If database is not connected, use env-based fallback admin
  if (mongoose.connection.readyState !== 1) {
    const validUsername = env.ADMIN_USERNAME || 'admin';
    const validEmail = env.ADMIN_EMAIL || 'admin@cst.uwu.ac.lk';
    const validPass = env.ADMIN_PASSWORD || 'admin12345';

    const inputClean = usernameOrEmail.trim().toLowerCase();
    const isUserMatch = inputClean === validUsername.toLowerCase() || inputClean === validEmail.toLowerCase();
    const isPassMatch = passwordPlain === validPass;

    if (!isUserMatch || !isPassMatch) {
      throw ApiError.unauthorized('Invalid username or password.');
    }

    const token = generateToken({
      id: 'admin-fallback-id',
      username: validUsername,
      email: validEmail,
      role: 'SUPER_ADMIN',
    });

    return {
      token,
      admin: {
        id: 'admin-fallback-id',
        username: validUsername,
        email: validEmail,
        role: 'SUPER_ADMIN',
        lastLoginAt: new Date(),
      },
    };
  }

  const query = usernameOrEmail.includes('@')
    ? { email: usernameOrEmail.trim().toLowerCase() }
    : { username: usernameOrEmail.trim() };

  const admin = await Admin.findOne(query);

  if (!admin) {
    throw ApiError.unauthorized('Invalid username or password.');
  }

  if (!admin.isActive) {
    throw ApiError.forbidden('Administrator account is deactivated. Contact tournament committee.');
  }

  const isMatch = await admin.comparePassword(passwordPlain);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid username or password.');
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = generateToken({
    id: (admin._id as any).toString(),
    username: admin.username,
    email: admin.email,
    role: admin.role,
  });

  await recordAudit({
    adminId: admin._id,
    adminUsername: admin.username,
    action: 'ADMIN_LOGIN',
    resourceType: 'Admin',
    resourceId: (admin._id as any).toString(),
    details: { loginTime: admin.lastLoginAt },
    req,
  });

  return {
    token,
    admin: {
      id: (admin._id as any).toString(),
      username: admin.username,
      email: admin.email,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt,
    },
  };
};
