import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Match } from '../models/Match';
import { Team } from '../models/Team';
import { Registration } from '../models/Registration';
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

    const registrations = await Registration.find({ status: { $in: ['PENDING', 'APPROVED'] } })
      .select('-captain.whatsappNumber -captain.phone -captain.email -players.email -players.steamId')
      .sort({ createdAt: -1 });

    const teamTags = new Set(teams.map((t) => (t.teamTag || '').toUpperCase()));
    const regTeams = registrations
      .filter((r) => !teamTags.has((r.teamTag || '').toUpperCase()))
      .map((r) => ({
        _id: r._id,
        teamName: r.teamName,
        teamTag: r.teamTag,
        teamLogo: r.teamLogo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
        university: r.university || 'Uva Wellassa University of Sri Lanka',
        status: (r.status || 'PENDING').toLowerCase(),
        captain: {
          name: r.captain?.name || 'Squad Leader',
          faculty: r.captain?.faculty || '',
        },
        players: (r.players || []).map((p) => ({
          name: p.fullName || 'Player',
          faculty: p.faculty || '',
          ign: p.inGameName || '',
          role: p.role || 'Player',
        })),
        createdAt: r.createdAt,
      }));

    ApiResponse.send(res, 200, 'Participating collegiate squads', [...teams, ...regTeams]);
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
