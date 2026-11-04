import mongoose from 'mongoose';
import { Match } from '../models/Match';
import { Team, ITeam } from '../models/Team';

export interface StandingsEntry {
  rank: number;
  id: string;
  name: string;
  tag: string;
  logo: string;
  university: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  roundsWon: number;
  roundsLost: number;
  roundDiff: number;
  winRate: number;
  form: ('W' | 'L')[];
  points: number;
}

export const recalculateAllStandings = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 1) return;

  const [teams, completedMatches] = await Promise.all([
    Team.find({ isActive: true }),
    Match.find({ status: 'COMPLETED' }).sort({ scheduledAt: 1 }),
  ]);

  const statsMap: Record<
    string,
    {
      played: number;
      wins: number;
      losses: number;
      roundsWon: number;
      roundsLost: number;
      form: ('W' | 'L')[];
      points: number;
    }
  > = {};

  teams.forEach((t) => {
    statsMap[(t._id as any).toString()] = {
      played: 0,
      wins: 0,
      losses: 0,
      roundsWon: 0,
      roundsLost: 0,
      form: [],
      points: 0,
    };
  });

  completedMatches.forEach((m) => {
    const idA = m.teamA ? (m.teamA as any).toString() : null;
    const idB = m.teamB ? (m.teamB as any).toString() : null;

    if (idA && statsMap[idA]) {
      statsMap[idA].played += 1;
      statsMap[idA].roundsWon += m.scoreA;
      statsMap[idA].roundsLost += m.scoreB;
      if (m.scoreA > m.scoreB) {
        statsMap[idA].wins += 1;
        statsMap[idA].points += 3;
        statsMap[idA].form.push('W');
      } else if (m.scoreB > m.scoreA) {
        statsMap[idA].losses += 1;
        statsMap[idA].form.push('L');
      }
    }

    if (idB && statsMap[idB]) {
      statsMap[idB].played += 1;
      statsMap[idB].roundsWon += m.scoreB;
      statsMap[idB].roundsLost += m.scoreA;
      if (m.scoreB > m.scoreA) {
        statsMap[idB].wins += 1;
        statsMap[idB].points += 3;
        statsMap[idB].form.push('W');
      } else if (m.scoreA > m.scoreB) {
        statsMap[idB].losses += 1;
        statsMap[idB].form.push('L');
      }
    }
  });

  const updatePromises = teams.map((team) => {
    const stats = statsMap[(team._id as any).toString()];
    if (!stats) return Promise.resolve();

    team.matchesPlayed = stats.played;
    team.wins = stats.wins;
    team.losses = stats.losses;
    team.roundsWon = stats.roundsWon;
    team.roundsLost = stats.roundsLost;
    team.roundDiff = stats.roundsWon - stats.roundsLost;
    team.winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
    team.form = stats.form.slice(-5);
    team.points = stats.points;

    return team.save();
  });

  await Promise.all(updatePromises);
};

export const getPublicStandings = async (): Promise<StandingsEntry[]> => {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const teams = await Team.find({ isActive: true })
    .sort({ points: -1, roundDiff: -1, wins: -1, teamName: 1 });

  if (teams.length === 0) {
    return [];
  }

  return teams.map((t, idx) => ({
    rank: idx + 1,
    id: (t._id as any).toString(),
    name: t.teamName,
    tag: t.teamTag,
    logo: t.teamLogo,
    university: t.university,
    matchesPlayed: t.matchesPlayed || 0,
    wins: t.wins || 0,
    losses: t.losses || 0,
    roundsWon: t.roundsWon || 0,
    roundsLost: t.roundsLost || 0,
    roundDiff: t.roundDiff || 0,
    winRate: t.winRate || 0,
    form: t.form || [],
    points: t.points || 0,
  }));
};
