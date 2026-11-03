import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Match } from '../models/Match';
import { Team } from '../models/Team';
import { getPublicStandings } from '../services/scoreboardService';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

const FALLBACK_TEAMS = [
  {
    _id: 'team-1',
    teamName: 'UWU Tactical Vanguard',
    teamTag: 'UWU.V',
    university: 'Uva Wellassa University of Sri Lanka',
    teamLogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
    captain: { name: 'Kasun Bandara' },
    players: [
      { fullName: 'Kasun Bandara', inGameName: 'V3CT0R_99', steamId: 'STEAM_0:1:45829102', role: 'In-Game Leader' },
      { fullName: 'Ravindu Senarath', inGameName: 'PhantomAWP', steamId: 'STEAM_0:0:38291048', role: 'Sniper' },
      { fullName: 'Dinuka Perera', inGameName: 'ApexStrike', steamId: 'STEAM_0:1:94827103', role: 'Entry Fragger' },
      { fullName: 'Naveen Jayasuriya', inGameName: 'CryoN', steamId: 'STEAM_0:0:19283746', role: 'Support' },
      { fullName: 'Shehan Alwis', inGameName: 'V0rtex', steamId: 'STEAM_0:1:56473829', role: 'Lurker' },
    ],
    matchesPlayed: 4,
    wins: 4,
    losses: 0,
    points: 12,
  },
  {
    _id: 'team-2',
    teamName: 'Moratuwa Cyber Titans',
    teamTag: 'MORA.CT',
    university: 'University of Moratuwa',
    teamLogo: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80',
    captain: { name: 'Isuru Wickramasinghe' },
    players: [
      { fullName: 'Isuru Wickramasinghe', inGameName: 'R34PER_X', steamId: 'STEAM_0:1:22334455', role: 'In-Game Leader' },
      { fullName: 'Sahan Fernando', inGameName: 'BulletStorm', steamId: 'STEAM_0:0:88776655', role: 'Entry Fragger' },
      { fullName: 'Minura Gunasekara', inGameName: 'Nighthawk', steamId: 'STEAM_0:1:99112233', role: 'Sniper' },
      { fullName: 'Sachith De Silva', inGameName: 'Overclock', steamId: 'STEAM_0:0:55443322', role: 'Support' },
      { fullName: 'Kavindu Rathnayake', inGameName: 'Pulse', steamId: 'STEAM_0:1:77889900', role: 'Lurker' },
    ],
    matchesPlayed: 4,
    wins: 3,
    losses: 1,
    points: 9,
  },
];

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
      ApiResponse.send(res, 200, 'Participating collegiate squads', FALLBACK_TEAMS);
      return;
    }

    const teams = await Team.find({ isActive: true })
      .select('-captain.phone -captain.email -players.email -substitute.email')
      .sort({ points: -1, teamName: 1 });

    ApiResponse.send(res, 200, 'Participating collegiate squads', teams.length > 0 ? teams : FALLBACK_TEAMS);
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
      const found = FALLBACK_TEAMS.find(t => t._id === id);
      if (found) {
        ApiResponse.send(res, 200, 'Squad dossier', found);
        return;
      }
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
