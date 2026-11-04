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
      ApiResponse.send(res, 200, 'Dashboard overview telemetry (demo fallback)', {
        stats: {
          totalRegistrations: 8,
          pendingRegistrations: 1,
          approvedRegistrations: 6,
          rejectedRegistrations: 1,
          totalTeams: 6,
          totalMatches: 8,
          completedMatches: 4,
          upcomingMatches: 3,
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
      ApiResponse.send(res, 200, 'Recent admin audit activity (demo fallback)', [
        {
          _id: 'act-1',
          adminUsername: 'admin',
          action: 'SEEDED_PLAYOFF_BRACKET',
          resourceType: 'Match',
          resourceId: 'playoff-tree',
          details: { round: 'quarterfinals' },
          timestamp: new Date(),
        },
      ]);
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

