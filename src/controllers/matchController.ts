import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Match, IMatch, CS2MapName } from '../models/Match';
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

    if (mongoose.connection.readyState !== 1) {
      ApiResponse.send(res, 200, 'Match retrieved (offline fallback)', {
        _id: id,
        stage: 'Playoff Match',
        teamAName: 'UWU CST Vanguard',
        teamATag: 'CST.VAN',
        teamALogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
        teamBName: 'UWU Tech Storm',
        teamBTag: 'TECH.STM',
        teamBLogo: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80',
        mapName: 'Mirage',
        scheduledAt: new Date(),
        status: 'LIVE',
        scoreA: 11,
        scoreB: 9,
      });
      return;
    }

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

    // CS2 MR12 Auto-Victory: If a team reached 13 rounds with >= 2 round lead or match completed
    const hasReachedVictory =
      (match.scoreA >= 13 && match.scoreA - match.scoreB >= 2) ||
      (match.scoreB >= 13 && match.scoreB - match.scoreA >= 2) ||
      (match.scoreA === 13 && match.scoreB <= 11) ||
      (match.scoreB === 13 && match.scoreA <= 11) ||
      match.status === 'COMPLETED';

    if (hasReachedVictory) {
      if (match.scoreA > match.scoreB) {
        match.winner = match.teamA;
      } else if (match.scoreB > match.scoreA) {
        match.winner = match.teamB;
      }
      match.status = 'COMPLETED';
      match.c4Planted = false;
    }

    await match.save();

    // Automatically advance winner in playoff bracket if match concluded
    if (match.winner && match.nextMatchNumber) {
      await advancePlayoffWinner(match);
    }

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

    // Automatically advance winner in playoff bracket if match is linked
    await advancePlayoffWinner(match);

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

// Helper: Automatically advance winner in playoff bracket tree
export const advancePlayoffWinner = async (match: IMatch) => {
  try {
    if (!match.winner || !match.nextMatchNumber) return;

    const winningTeam = await Team.findById(match.winner);
    if (!winningTeam) return;

    const nextMatch = await Match.findOne({ matchNumber: match.nextMatchNumber });
    if (!nextMatch) return;

    if (match.nextMatchSlot === 'teamA') {
      nextMatch.teamA = winningTeam._id as any;
      nextMatch.teamAName = winningTeam.teamName;
      nextMatch.teamATag = winningTeam.teamTag;
      nextMatch.teamALogo = winningTeam.teamLogo;
    } else {
      nextMatch.teamB = winningTeam._id as any;
      nextMatch.teamBName = winningTeam.teamName;
      nextMatch.teamBTag = winningTeam.teamTag;
      nextMatch.teamBLogo = winningTeam.teamLogo;
    }

    if (nextMatch.teamAName !== 'TBD' && nextMatch.teamBName !== 'TBD') {
      if (nextMatch.status === 'UPCOMING' || !nextMatch.status) {
        nextMatch.status = 'UPCOMING';
      }
    }

    await nextMatch.save();

    // Cascading progression: if downstream match was already decided, advance its winner too
    if (nextMatch.status === 'COMPLETED' && nextMatch.winner && nextMatch.nextMatchNumber) {
      await advancePlayoffWinner(nextMatch);
    }
  } catch (err) {
    console.error('Failed advancing playoff winner:', err);
  }
};

// Core: Automatically generate Playoff Bracket from approved teams
export const seedPlayoffsFromApprovedTeams = async (): Promise<IMatch[]> => {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const approvedTeams = await Team.find({ isActive: true }).sort({ points: -1, roundDiff: -1, wins: -1 });

  if (approvedTeams.length < 2) {
    throw new Error('At least 2 approved squads are required to generate the playoff bracket.');
  }

  // Remove previous upcoming/unstarted playoff matches to re-seed cleanly
  await Match.deleteMany({
    bracketRound: { $in: ['quarterfinals', 'semifinals', 'final', 'third_place'] },
    status: { $in: ['UPCOMING'] },
  });

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 2); // 2 days ahead
  baseDate.setHours(10, 0, 0, 0);

  const createdMatches: IMatch[] = [];

  const t = approvedTeams;
  const teamSlots = [
    t[0] || null, // Seed 1
    t[7] || t[1] || null, // Seed 8
    t[3] || null, // Seed 4
    t[4] || null, // Seed 5
    t[1] || null, // Seed 2
    t[6] || null, // Seed 7
    t[2] || null, // Seed 3
    t[5] || null, // Seed 6
  ];

  // 1. Quarterfinals (Matches 101, 102, 103, 104)
  const qfData = [
    {
      matchNumber: 101,
      stage: 'Quarterfinal 1 (MR12)',
      teamA: teamSlots[0],
      teamB: teamSlots[1],
      mapName: 'Mirage' as CS2MapName,
      scheduledAt: new Date(baseDate.getTime()),
      bracketRound: 'quarterfinals' as const,
      bracketPosition: 1,
      nextMatchNumber: 105,
      nextMatchSlot: 'teamA' as const,
    },
    {
      matchNumber: 102,
      stage: 'Quarterfinal 2 (MR12)',
      teamA: teamSlots[2],
      teamB: teamSlots[3],
      mapName: 'Inferno' as CS2MapName,
      scheduledAt: new Date(baseDate.getTime() + 7200000), // +2h
      bracketRound: 'quarterfinals' as const,
      bracketPosition: 2,
      nextMatchNumber: 105,
      nextMatchSlot: 'teamB' as const,
    },
    {
      matchNumber: 103,
      stage: 'Quarterfinal 3 (MR12)',
      teamA: teamSlots[4],
      teamB: teamSlots[5],
      mapName: 'Dust II' as CS2MapName,
      scheduledAt: new Date(baseDate.getTime() + 14400000), // +4h
      bracketRound: 'quarterfinals' as const,
      bracketPosition: 3,
      nextMatchNumber: 106,
      nextMatchSlot: 'teamA' as const,
    },
    {
      matchNumber: 104,
      stage: 'Quarterfinal 4 (MR12)',
      teamA: teamSlots[6],
      teamB: teamSlots[7],
      mapName: 'Ancient' as CS2MapName,
      scheduledAt: new Date(baseDate.getTime() + 21600000), // +6h
      bracketRound: 'quarterfinals' as const,
      bracketPosition: 4,
      nextMatchNumber: 106,
      nextMatchSlot: 'teamB' as const,
    },
  ];

  for (const qf of qfData) {
    const m = await Match.create({
      matchNumber: qf.matchNumber,
      stage: qf.stage,
      teamA: qf.teamA?._id,
      teamB: qf.teamB?._id,
      teamAName: qf.teamA?.teamName || 'TBD',
      teamATag: qf.teamA?.teamTag || 'TBD',
      teamALogo: qf.teamA?.teamLogo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
      teamBName: qf.teamB?.teamName || 'TBD',
      teamBTag: qf.teamB?.teamTag || 'TBD',
      teamBLogo: qf.teamB?.teamLogo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
      mapName: qf.mapName,
      scheduledAt: qf.scheduledAt,
      status: 'UPCOMING',
      scoreA: 0,
      scoreB: 0,
      streamUrl: 'https://twitch.tv/cst_lan_challenge',
      bracketRound: qf.bracketRound,
      bracketPosition: qf.bracketPosition,
      nextMatchNumber: qf.nextMatchNumber,
      nextMatchSlot: qf.nextMatchSlot,
    });
    createdMatches.push(m);
  }

  // 2. Semifinals (Matches 105, 106)
  const sfDate = new Date(baseDate.getTime() + 86400000); // Next day
  const sfData = [
    {
      matchNumber: 105,
      stage: 'Semifinal 1 (MR12)',
      mapName: 'Nuke' as CS2MapName,
      scheduledAt: new Date(sfDate.getTime() + 3600000),
      bracketRound: 'semifinals' as const,
      bracketPosition: 1,
      nextMatchNumber: 107,
      nextMatchSlot: 'teamA' as const,
    },
    {
      matchNumber: 106,
      stage: 'Semifinal 2 (MR12)',
      mapName: 'Anubis' as CS2MapName,
      scheduledAt: new Date(sfDate.getTime() + 10800000),
      bracketRound: 'semifinals' as const,
      bracketPosition: 2,
      nextMatchNumber: 107,
      nextMatchSlot: 'teamB' as const,
    },
  ];

  for (const sf of sfData) {
    const m = await Match.create({
      matchNumber: sf.matchNumber,
      stage: sf.stage,
      teamAName: 'Winner QF 1',
      teamATag: 'W.QF1',
      teamALogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
      teamBName: 'Winner QF 2',
      teamBTag: 'W.QF2',
      teamBLogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
      mapName: sf.mapName,
      scheduledAt: sf.scheduledAt,
      status: 'UPCOMING',
      scoreA: 0,
      scoreB: 0,
      streamUrl: 'https://twitch.tv/cst_lan_challenge',
      bracketRound: sf.bracketRound,
      bracketPosition: sf.bracketPosition,
      nextMatchNumber: sf.nextMatchNumber,
      nextMatchSlot: sf.nextMatchSlot,
    });
    createdMatches.push(m);
  }

  // 3. Grand Final (Match 107)
  const finalDate = new Date(sfDate.getTime() + 21600000); // Evening of Semifinal day
  const gf = await Match.create({
    matchNumber: 107,
    stage: 'Grand Final (LAN Main Auditorium Stage)',
    teamAName: 'Winner Semifinal 1',
    teamATag: 'W.SF1',
    teamALogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
    teamBName: 'Winner Semifinal 2',
    teamBTag: 'W.SF2',
    teamBLogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
    mapName: 'Mirage',
    scheduledAt: finalDate,
    status: 'UPCOMING',
    scoreA: 0,
    scoreB: 0,
    streamUrl: 'https://twitch.tv/cst_lan_challenge',
    bracketRound: 'final',
    bracketPosition: 1,
  });
  createdMatches.push(gf);

  // 4. 3rd Place Match (Match 108)
  const bronzeMatch = await Match.create({
    matchNumber: 108,
    stage: '3rd Place Bronze Decider',
    teamAName: 'Runner-up Semifinal 1',
    teamATag: 'RU.SF1',
    teamALogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
    teamBName: 'Runner-up Semifinal 2',
    teamBTag: 'RU.SF2',
    teamBLogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
    mapName: 'Dust II',
    scheduledAt: new Date(finalDate.getTime() - 7200000),
    status: 'UPCOMING',
    scoreA: 0,
    scoreB: 0,
    streamUrl: 'https://twitch.tv/cst_lan_challenge',
    bracketRound: 'third_place',
    bracketPosition: 1,
  });
  createdMatches.push(bronzeMatch);

  return createdMatches;
};

// Admin: Automatically generate Playoff Bracket endpoint
export const handleGeneratePlayoffs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      ApiResponse.send(res, 201, 'Official Playoff Bracket initialized in offline fallback mode.', []);
      return;
    }

    const createdMatches = await seedPlayoffsFromApprovedTeams();

    await recordAudit({
      adminId: req.admin?._id,
      adminUsername: req.admin?.username || 'admin',
      action: 'GENERATE_PLAYOFF_BRACKET',
      resourceType: 'Match',
      resourceId: 'playoff-tree',
      details: { generatedCount: createdMatches.length },
      req,
    });

    ApiResponse.send(res, 201, 'Official Playoff Bracket generated successfully from approved squads.', createdMatches);
  } catch (error: any) {
    if (error.message?.includes('At least 2 approved')) {
      next(ApiError.badRequest(error.message));
    } else {
      next(error);
    }
  }
};

// Public: Get structured Playoff Bracket
export const handleGetPlayoffBracket = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const fallbackQuarterfinals = [
        {
          _id: 'qf-1',
          matchNumber: 101,
          stage: 'Quarterfinal 1 (MR12)',
          teamAName: 'UWU CST Vanguard',
          teamATag: 'CST.VAN',
          teamALogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
          teamBName: 'UWU Tech Outlaws',
          teamBTag: 'TECH.OUT',
          teamBLogo: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=200&auto=format&fit=crop&q=80',
          mapName: 'Mirage',
          scheduledAt: new Date(Date.now() - 36000000),
          status: 'COMPLETED',
          scoreA: 13,
          scoreB: 7,
          winner: 'team-1',
          bracketRound: 'quarterfinals',
          bracketPosition: 1,
          nextMatchNumber: 105,
          nextMatchSlot: 'teamA',
        },
        {
          _id: 'qf-2',
          matchNumber: 102,
          stage: 'Quarterfinal 2 (MR12)',
          teamAName: 'UWU FAS Strikers',
          teamATag: 'FAS.STR',
          teamALogo: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80',
          teamBName: 'UWU MGT Apex',
          teamBTag: 'MGT.APX',
          teamBLogo: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=200&auto=format&fit=crop&q=80',
          mapName: 'Inferno',
          scheduledAt: new Date(Date.now() - 28800000),
          status: 'COMPLETED',
          scoreA: 13,
          scoreB: 11,
          winner: 'team-3',
          bracketRound: 'quarterfinals',
          bracketPosition: 2,
          nextMatchNumber: 105,
          nextMatchSlot: 'teamB',
        },
        {
          _id: 'qf-3',
          matchNumber: 103,
          stage: 'Quarterfinal 3 (MR12)',
          teamAName: 'UWU Tech Storm',
          teamATag: 'TECH.STM',
          teamALogo: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80',
          teamBName: 'UWU ANS Titans',
          teamBTag: 'ANS.TTN',
          teamBLogo: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80',
          mapName: 'Dust II',
          scheduledAt: new Date(Date.now() - 21600000),
          status: 'COMPLETED',
          scoreA: 13,
          scoreB: 5,
          winner: 'team-2',
          bracketRound: 'quarterfinals',
          bracketPosition: 3,
          nextMatchNumber: 106,
          nextMatchSlot: 'teamA',
        },
        {
          _id: 'qf-4',
          matchNumber: 104,
          stage: 'Quarterfinal 4 (MR12)',
          teamAName: 'UWU MED Cyber Wolves',
          teamATag: 'MED.WLV',
          teamALogo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80',
          teamBName: 'UWU CST Phantoms',
          teamBTag: 'CST.PHN',
          teamBLogo: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80',
          mapName: 'Ancient',
          scheduledAt: new Date(Date.now() - 14400000),
          status: 'COMPLETED',
          scoreA: 13,
          scoreB: 9,
          winner: 'team-5',
          bracketRound: 'quarterfinals',
          bracketPosition: 4,
          nextMatchNumber: 106,
          nextMatchSlot: 'teamB',
        },
      ];

      const fallbackSemifinals = [
        {
          _id: 'sf-1',
          matchNumber: 105,
          stage: 'Semifinal 1 (MR12)',
          teamAName: 'UWU CST Vanguard',
          teamATag: 'CST.VAN',
          teamALogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
          teamBName: 'UWU FAS Strikers',
          teamBTag: 'FAS.STR',
          teamBLogo: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80',
          mapName: 'Nuke',
          scheduledAt: new Date(),
          status: 'LIVE',
          scoreA: 11,
          scoreB: 9,
          bracketRound: 'semifinals',
          bracketPosition: 1,
          nextMatchNumber: 107,
          nextMatchSlot: 'teamA',
        },
        {
          _id: 'sf-2',
          matchNumber: 106,
          stage: 'Semifinal 2 (MR12)',
          teamAName: 'UWU Tech Storm',
          teamATag: 'TECH.STM',
          teamALogo: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80',
          teamBName: 'UWU MED Cyber Wolves',
          teamBTag: 'MED.WLV',
          teamBLogo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80',
          mapName: 'Anubis',
          scheduledAt: new Date(Date.now() + 7200000),
          status: 'UPCOMING',
          scoreA: 0,
          scoreB: 0,
          bracketRound: 'semifinals',
          bracketPosition: 2,
          nextMatchNumber: 107,
          nextMatchSlot: 'teamB',
        },
      ];

      const fallbackFinal = {
        _id: 'final-1',
        matchNumber: 107,
        stage: 'Grand Final (LAN Main Auditorium Stage)',
        teamAName: 'Winner Semifinal 1',
        teamATag: 'W.SF1',
        teamALogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
        teamBName: 'Winner Semifinal 2',
        teamBTag: 'W.SF2',
        teamBLogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
        mapName: 'Mirage',
        scheduledAt: new Date(Date.now() + 28800000),
        status: 'UPCOMING',
        scoreA: 0,
        scoreB: 0,
        bracketRound: 'final',
        bracketPosition: 1,
      };

      const fallbackThirdPlace = {
        _id: 'bronze-1',
        matchNumber: 108,
        stage: '3rd Place Bronze Decider',
        teamAName: 'Runner-up Semifinal 1',
        teamATag: 'RU.SF1',
        teamALogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
        teamBName: 'Runner-up Semifinal 2',
        teamBTag: 'RU.SF2',
        teamBLogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
        mapName: 'Dust II',
        scheduledAt: new Date(Date.now() + 21600000),
        status: 'UPCOMING',
        scoreA: 0,
        scoreB: 0,
        bracketRound: 'third_place',
        bracketPosition: 1,
      };

      ApiResponse.send(res, 200, 'Playoff bracket retrieved (offline fallback)', {
        quarterfinals: fallbackQuarterfinals,
        semifinals: fallbackSemifinals,
        final: fallbackFinal,
        thirdPlace: fallbackThirdPlace,
        champion: null,
      });
      return;
    }

    const playoffMatches = await Match.find({
      bracketRound: { $in: ['quarterfinals', 'semifinals', 'final', 'third_place'] },
    }).sort({ matchNumber: 1 });

    const quarterfinals = playoffMatches.filter(m => m.bracketRound === 'quarterfinals');
    const semifinals = playoffMatches.filter(m => m.bracketRound === 'semifinals');
    const final = playoffMatches.find(m => m.bracketRound === 'final') || null;
    const thirdPlace = playoffMatches.find(m => m.bracketRound === 'third_place') || null;

    let champion = null;
    if (final && final.status === 'COMPLETED' && final.winner) {
      champion = await Team.findById(final.winner);
    }

    ApiResponse.send(res, 200, 'Playoff bracket retrieved', {
      quarterfinals,
      semifinals,
      final,
      thirdPlace,
      champion,
    });
  } catch (error) {
    next(error);
  }
};
