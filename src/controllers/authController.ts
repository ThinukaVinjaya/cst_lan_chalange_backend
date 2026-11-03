import { Request, Response, NextFunction } from 'express';
import { loginAdmin } from '../services/authService';
import { ApiResponse } from '../utils/ApiResponse';
import { setAuthCookie, clearAuthCookie } from '../utils/generateToken';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { recordAudit } from '../services/auditService';

export const handleLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { usernameOrEmail, password } = req.body;
    const result = await loginAdmin(usernameOrEmail, password, req);

    // Set HTTP-only cookie
    setAuthCookie(res, result.token);

    ApiResponse.send(res, 200, 'Administrator authenticated successfully', result);
  } catch (error) {
    next(error);
  }
};

export const handleLogout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.admin) {
      await recordAudit({
        adminId: req.admin._id,
        adminUsername: req.admin.username,
        action: 'ADMIN_LOGOUT',
        resourceType: 'Admin',
        resourceId: (req.admin._id as any).toString(),
        req,
      });
    }

    clearAuthCookie(res);
    ApiResponse.send(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

export const handleGetMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    ApiResponse.send(res, 200, 'Current administrator profile', {
      admin: {
        id: (req.admin._id as any).toString(),
        username: req.admin.username,
        email: req.admin.email,
        role: req.admin.role,
        lastLoginAt: req.admin.lastLoginAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

