import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Match } from '../models/Match';
import { Team } from '../models/Team';
import { getPublicStandings } from '../services/scoreboardService';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export const handleGetPublicScoreboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const standings = await getPublicStandings();
      ApiResponse.send(res, 200, 'Public scoreboard data', {
        liveMatches: [],
        upcomingMatches: [],
        completedMatches: [],
        standings,
      });
      return;
    }

    const [liveMatches, upcomingMatches, completedMatches, standings] = await Promise.all([
      Match.find({ status: 'LIVE' }).sort({ scheduledAt: 1 }),
      Match.find({ status: 'UPCOMING' }).sort({ scheduledAt: 1 }).limit(10),
      Match.find({ status: 'COMPLETED' }).sort({ publishedAt: -1, scheduledAt: -1 }).limit(15),
      getPublicStandings(),
    ]);

    ApiResponse.send(res, 200, 'Public scoreboard data', {
      liveMatches,
      upcomingMatches,
      completedMatches,
      standings,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetPublicStandings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const standings = await getPublicStandings();
    ApiResponse.send(res, 200, 'Tournament standings matrix', standings);
  } catch (error) {
    next(error);
  }
};

export const handleGetPublicTeams = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      ApiResponse.send(res, 200, 'Participating collegiate squads', []);
      return;
    }

    const teams = await Team.find({ isActive: true })
      .select('-captain.phone -captain.email -players.email -substitute.email')
      .sort({ points: -1, teamName: 1 });

    ApiResponse.send(res, 200, 'Participating collegiate squads', teams);
  } catch (error) {
    next(error);
  }
};

export const handleGetPublicTeamById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (mongoose.connection.readyState !== 1) {
      throw ApiError.notFound('Participating squad not found');
    }

    const team = await Team.findOne({ _id: id, isActive: true })
      .select('-captain.phone -captain.email -players.email -substitute.email');

    if (!team) {
      throw ApiError.notFound('Participating squad not found');
    }

    ApiResponse.send(res, 200, 'Squad dossier', team);
  } catch (error) {
    next(error);
  }
};
