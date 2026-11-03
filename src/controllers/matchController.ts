import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Match, IMatch } from '../models/Match';
import { Team } from '../models/Team';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { recordAudit } from '../services/auditService';
import { recalculateAllStandings } from '../services/scoreboardService';

// Admin: Create Match
export const handleCreateMatch = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { stage, teamA, teamB, mapName, scheduledAt, streamUrl, matchNumber } = req.body;

    const [teamARecord, teamBRecord] = await Promise.all([
      Team.findById(teamA),
      Team.findById(teamB),
    ]);

    if (!teamARecord || !teamBRecord) {
      throw ApiError.notFound('One or both selected teams do not exist.');
    }

    const matchCount = await Match.countDocuments();

    const match = await Match.create({
      matchNumber: matchNumber || matchCount + 1,
      stage,
      teamA: teamARecord._id,
      teamB: teamBRecord._id,
      teamAName: teamARecord.teamName,
      teamATag: teamARecord.teamTag,
      teamALogo: teamARecord.teamLogo,
      teamBName: teamBRecord.teamName,
      teamBTag: teamBRecord.teamTag,
      teamBLogo: teamBRecord.teamLogo,
      mapName,
      scheduledAt: new Date(scheduledAt),
      status: 'UPCOMING',
      scoreA: 0,
      scoreB: 0,
      streamUrl: streamUrl || 'https://twitch.tv/cst_lan_challenge',
      currentRound: 0,
      half: 1,
      c4Planted: false,
      teamASide: 'CT',
      teamBSide: 'T',
    });

    await recordAudit({
      adminId: req.admin?._id,
      adminUsername: req.admin?.username || 'admin',
      action: 'CREATE_MATCH',
      resourceType: 'Match',
      resourceId: (match._id as any).toString(),
      details: {
        matchId: match._id,
        teamA: match.teamATag,
        teamB: match.teamBTag,
        map: match.mapName,
      },
      req,
    });

    ApiResponse.send(res, 201, 'Match fixture created successfully', match);
  } catch (error) {
    next(error);
  }
};

// Admin & Public: Get matches
export const handleGetMatches = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, limit } = req.query;

    if (mongoose.connection.readyState !== 1) {
      // Fallback sample matches
      const fallbackMatches = [
        {
          _id: 'm-1',
          matchNumber: 1,
          stage: 'Upper Bracket Semifinal 1 (MR12)',
          teamAName: 'UWU Tactical Vanguard',
          teamATag: 'UWU.V',
          teamALogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
          teamBName: 'Moratuwa Cyber Titans',
          teamBTag: 'MORA.CT',
          teamBLogo: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80',
          mapName: 'Mirage',
          scheduledAt: new Date(),
          status: 'LIVE',
          scoreA: 11,
          scoreB: 9,
          streamUrl: 'https://twitch.tv/cst_lan_challenge',
          currentRound: 20,
          half: 2,
          c4Planted: false,
          teamASide: 'CT',
          teamBSide: 'T',
        },
        {
          _id: 'm-2',
          matchNumber: 2,
          stage: 'Upper Bracket Semifinal 2',
          teamAName: 'Colombo Apex Esports',
          teamATag: 'UOC.APX',
          teamALogo: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=200&auto=format&fit=crop&q=80',
          teamBName: 'Peradeniya Iron Vipers',
          teamBTag: 'UOP.VIPER',
          teamBLogo: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80',
          mapName: 'Inferno',
          scheduledAt: new Date(Date.now() + 7200000),
          status: 'UPCOMING',
          scoreA: 0,
          scoreB: 0,
        },
      ];
      ApiResponse.send(res, 200, 'Matches retrieved', fallbackMatches);
      return;
    }

    const filter: Record<string, any> = {};

    if (status && status !== 'all') {
      filter.status = (status as string).toUpperCase();
    }

    const query = Match.find(filter).sort({ scheduledAt: -1, createdAt: -1 });

    if (limit) {
      query.limit(parseInt(limit as string, 10));
    }

    const matches = await query;
    ApiResponse.send(res, 200, 'Matches retrieved', matches);
  } catch (error) {
    next(error);
  }
};

// Admin & Public: Get single match
export const handleGetMatchById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const match = await Match.findById(id);
    if (!match) {
      throw ApiError.notFound('Match fixture not found');
    }
    ApiResponse.send(res, 200, 'Match retrieved', match);
  } catch (error) {
    next(error);
  }
};

// Admin: Update Match Details
export const handleUpdateMatch = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const match = await Match.findById(id);
    if (!match) {
      throw ApiError.notFound('Match not found');
    }

    if (updates.teamA && updates.teamA !== (match.teamA as any).toString()) {
      const teamARecord = await Team.findById(updates.teamA);
      if (teamARecord) {
        match.teamA = teamARecord._id as any;
        match.teamAName = teamARecord.teamName;
        match.teamATag = teamARecord.teamTag;
        match.teamALogo = teamARecord.teamLogo;
      }
    }

    if (updates.teamB && updates.teamB !== (match.teamB as any).toString()) {
      const teamBRecord = await Team.findById(updates.teamB);
      if (teamBRecord) {
        match.teamB = teamBRecord._id as any;
        match.teamBName = teamBRecord.teamName;
        match.teamBTag = teamBRecord.teamTag;
        match.teamBLogo = teamBRecord.teamLogo;
      }
    }

    if (updates.stage !== undefined) match.stage = updates.stage;
    if (updates.mapName !== undefined) match.mapName = updates.mapName;
    if (updates.scheduledAt !== undefined) match.scheduledAt = new Date(updates.scheduledAt);
    if (updates.streamUrl !== undefined) match.streamUrl = updates.streamUrl;
    if (updates.status !== undefined) match.status = updates.status;

    await match.save();

    await recordAudit({
      adminId: req.admin?._id,
      adminUsername: req.admin?.username || 'admin',
      action: 'UPDATE_MATCH',
      resourceType: 'Match',
      resourceId: (match._id as any).toString(),
      details: updates,
      req,
    });

    ApiResponse.send(res, 200, 'Match updated successfully', match);
  } catch (error) {
    next(error);
  }
};

// Admin: Delete Match (only if not completed)
export const handleDeleteMatch = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const match = await Match.findById(id);

    if (!match) {
      throw ApiError.notFound('Match not found');
    }

    if (match.status === 'COMPLETED') {
      throw ApiError.badRequest('Cannot delete an officially ratified and published match result.');
    }

    await Match.findByIdAndDelete(id);

    await recordAudit({
      adminId: req.admin?._id,
      adminUsername: req.admin?.username || 'admin',
      action: 'DELETE_MATCH',
      resourceType: 'Match',
      resourceId: id,
      details: { teamA: match.teamATag, teamB: match.teamBTag },
      req,
    });

    ApiResponse.send(res, 200, 'Match fixture deleted');
  } catch (error) {
    next(error);
  }
};

// Admin: Live Referee Scoring Desk (Update Live Rounds & C4 Alert)
export const handleUpdateMatchScore = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { scoreA, scoreB, status, mvp, currentRound, half, c4Planted, teamASide, teamBSide } =
      req.body;

    const match = await Match.findById(id);
    if (!match) {
      throw ApiError.notFound('Match not found');
    }

    if (scoreA !== undefined) match.scoreA = Number(scoreA);
    if (scoreB !== undefined) match.scoreB = Number(scoreB);
    if (status !== undefined) match.status = status;
    if (mvp !== undefined) match.mvp = mvp;
    if (c4Planted !== undefined) match.c4Planted = !!c4Planted;
    if (teamASide !== undefined) match.teamASide = teamASide;
    if (teamBSide !== undefined) match.teamBSide = teamBSide;

    const calcRound = match.scoreA + match.scoreB;
    match.currentRound = currentRound !== undefined ? currentRound : calcRound;

    if (half !== undefined) {
      match.half = half;
    } else {
      match.half = calcRound <= 12 ? 1 : calcRound <= 24 ? 2 : 'OT';
    }

    await match.save();

    ApiResponse.send(res, 200, 'Live match telemetry updated', match);
  } catch (error) {
    next(error);
  }
};

// Admin: Publish Final Match Score & Recalculate Standings
export const handlePublishMatchScore = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { scoreA, scoreB, mvp } = req.body;

    const match = await Match.findById(id);
    if (!match) {
      throw ApiError.notFound('Match not found');
    }

    if (scoreA !== undefined) match.scoreA = Number(scoreA);
    if (scoreB !== undefined) match.scoreB = Number(scoreB);
    if (mvp !== undefined) match.mvp = mvp;

    match.status = 'COMPLETED';
    match.publishedAt = new Date();
    match.c4Planted = false;

    // Determine winner
    if (match.scoreA > match.scoreB) {
      match.winner = match.teamA;
    } else if (match.scoreB > match.scoreA) {
      match.winner = match.teamB;
    }

    await match.save();

    // Recalculate tournament standings automatically
    await recalculateAllStandings();

    await recordAudit({
      adminId: req.admin?._id,
      adminUsername: req.admin?.username || 'admin',
      action: 'PUBLISH_MATCH_RESULT',
      resourceType: 'Match',
      resourceId: (match._id as any).toString(),
      details: {
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        winner: match.winner,
        mvp: match.mvp,
      },
      req,
    });

    ApiResponse.send(
      res,
      200,
      `Match score ratified: ${match.teamATag} (${match.scoreA}) - (${match.scoreB}) ${match.teamBTag}. Standings recalculated.`,
      match
    );
  } catch (error) {
    next(error);
  }
};
