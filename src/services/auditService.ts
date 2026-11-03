import { Request } from 'express';
import { AuditLog } from '../models/AuditLog';
import { AuthenticatedRequest } from '../middleware/authenticate';

export interface RecordAuditParams {
  adminId?: any;
  adminUsername: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  req?: Request | AuthenticatedRequest;
}

export const recordAudit = async (params: RecordAuditParams): Promise<void> => {
  try {
    const ipAddress =
      (params.req?.headers['x-forwarded-for'] as string) ||
      params.req?.socket?.remoteAddress ||
      '';

    const userAgent = params.req?.headers['user-agent'] || '';

    // Sanitize details to never leak passwords or tokens
    const sanitizedDetails = params.details ? { ...params.details } : {};
    delete sanitizedDetails.password;
    delete sanitizedDetails.passwordHash;
    delete sanitizedDetails.token;

    await AuditLog.create({
      adminId: params.adminId,
      adminUsername: params.adminUsername,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      details: sanitizedDetails,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  } catch (error) {
    // Audit logging shouldn't crash primary execution, but report to console
    console.error('Failed to write audit log entry:', error);
  }
};

