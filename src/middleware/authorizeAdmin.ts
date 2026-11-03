import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';
import { ApiError } from '../utils/ApiError';

export const authorizeAdmin = (
  allowedRoles: Array<'SUPER_ADMIN' | 'TOURNAMENT_ADMIN' | 'REFEREE'> = ['SUPER_ADMIN', 'TOURNAMENT_ADMIN']
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      return next(ApiError.unauthorized('Authentication required.'));
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return next(
        ApiError.forbidden(
          `Insufficient permissions. Requires one of roles: [${allowedRoles.join(', ')}]`
        )
      );
    }

    next();
  };
};

