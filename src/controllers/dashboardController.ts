import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Registration } from '../models/Registration';
import { Team } from '../models/Team';
import { Match } from '../models/Match';
import { AuditLog } from '../models/AuditLog';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../middleware/authenticate';

export const handleGetDashboardOverview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      ApiResponse.send(res, 200, 'Dashboard overview telemetry', {
        stats: {
          totalRegistrations: 0,
          pendingRegistrations: 0,
          approvedRegistrations: 0,
          rejectedRegistrations: 0,
          totalTeams: 0,
          totalMatches: 0,
          completedMatches: 0,
          upcomingMatches: 0,
        },
        recentRegistrations: [],
        recentMatches: [],
      });
      return;
    }

    const [
      totalRegistrations,
      pendingRegistrations,
      approvedRegistrations,
      rejectedRegistrations,
      totalTeams,
      totalMatches,
      completedMatches,
      upcomingMatches,
      recentRegistrations,
      recentMatches,
    ] = await Promise.all([
      Registration.countDocuments(),
      Registration.countDocuments({ status: 'PENDING' }),
      Registration.countDocuments({ status: 'APPROVED' }),
      Registration.countDocuments({ status: 'REJECTED' }),
      Team.countDocuments({ isActive: true }),
      Match.countDocuments(),
      Match.countDocuments({ status: 'COMPLETED' }),
      Match.countDocuments({ status: 'UPCOMING' }),
      Registration.find().sort({ createdAt: -1 }).limit(5),
      Match.find().sort({ scheduledAt: -1 }).limit(5),
    ]);

    ApiResponse.send(res, 200, 'Dashboard overview telemetry', {
      stats: {
        totalRegistrations,
        pendingRegistrations,
        approvedRegistrations,
        rejectedRegistrations,
        totalTeams,
        totalMatches,
        completedMatches,
        upcomingMatches,
      },
      recentRegistrations,
      recentMatches,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetDashboardActivity = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      ApiResponse.send(res, 200, 'Recent admin audit activity', []);
      return;
    }

    const { limit = '20' } = req.query;
    const limitNum = parseInt(limit as string, 10) || 20;

    const activity = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(limitNum);

    ApiResponse.send(res, 200, 'Recent admin audit activity', activity);
  } catch (error) {
    next(error);
  }
};

