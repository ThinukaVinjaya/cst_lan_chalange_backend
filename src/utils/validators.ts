import { z } from 'zod';

export const CS2_MAPS = [
  'Mirage',
  'Dust II',
  'Inferno',
  'Ancient',
  'Nuke',
  'Anubis',
  'Vertigo',
] as const;

export const MATCH_STATUSES = ['UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED'] as const;

export const REGISTRATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

// Steam ID regex validator supporting:
// - Classic format: STEAM_0:0:123456 or STEAM_1:1:123456
// - SteamID3: [U:1:123456]
// - SteamID64: 17 digits e.g. 76561198...
// - Or common university CS2 identifier format
export const steamIdRegex = /^(STEAM_[0-5]:[0-1]:[0-9]+|\[U:1:[0-9]+\]|[0-9]{17}|[A-Za-z0-9_.-]{3,32})$/;

export const PlayerSchema = z.object({
  fullName: z.string().min(2, 'Player full name is required').max(100),
  inGameName: z.string().min(2, 'Player in-game name (IGN) is required').max(30),
  steamId: z.string().regex(steamIdRegex, 'Valid Steam ID format required (e.g. STEAM_0:1:45829102 or 17-digit SteamID64)'),
  email: z.string().email('Valid student email required').toLowerCase(),
  role: z.string().optional().default('PLAYER'),
});

export const CaptainSchema = z.object({
  name: z.string().min(2, 'Captain full name is required').max(100),
  email: z.string().email('Valid student email is required').toLowerCase(),
  phone: z.string().min(7, 'Valid contact phone number is required').max(20),
});

export const RegistrationSubmitSchema = z.object({
  teamName: z.string().min(3, 'Team name must be at least 3 characters').max(50),
  teamTag: z.string().min(2, 'Team tag must be at least 2 characters').max(10).toUpperCase(),
  university: z.string().min(3, 'University affiliation is required').max(150),
  captain: CaptainSchema,
  players: z.array(PlayerSchema).length(5, 'Registration requires exactly 5 main players'),
  substitute: PlayerSchema.optional().nullable(),
  teamLogo: z.string().optional(),
}).refine((data) => {
  // Check for duplicate emails or Steam IDs within the team roster
  const allPlayers = [...data.players];
  if (data.substitute && data.substitute.steamId) {
    allPlayers.push(data.substitute);
  }

  const steamIds = allPlayers.map(p => p.steamId.trim().toLowerCase());
  const emails = allPlayers.map(p => p.email.trim().toLowerCase());

  const uniqueSteamIds = new Set(steamIds);
  const uniqueEmails = new Set(emails);

  return uniqueSteamIds.size === steamIds.length && uniqueEmails.size === emails.length;
}, {
  message: 'Each player on the team roster must have a unique Steam ID and Email address.',
  path: ['players'],
});

export const AdminLoginSchema = z.object({
  usernameOrEmail: z.string().min(3, 'Username or email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const MatchCreateSchema = z.object({
  matchNumber: z.number().int().positive().optional(),
  stage: z.string().min(2, 'Stage is required (e.g. Upper Bracket Semifinal)'),
  teamA: z.string().min(1, 'Team A ID is required'),
  teamB: z.string().min(1, 'Team B ID is required'),
  mapName: z.enum(CS2_MAPS, { errorMap: () => ({ message: 'Invalid CS2 map selection' }) }),
  scheduledAt: z.string().or(z.date()),
  status: z.enum(MATCH_STATUSES).optional().default('UPCOMING'),
  streamUrl: z.string().url().optional().or(z.literal('')),
}).refine(data => data.teamA !== data.teamB, {
  message: 'Team A and Team B cannot be the same team',
  path: ['teamB'],
});

export const MatchScoreUpdateSchema = z.object({
  scoreA: z.number().int().min(0, 'Score A must be non-negative'),
  scoreB: z.number().int().min(0, 'Score B must be non-negative'),
  status: z.enum(MATCH_STATUSES).optional(),
  mvp: z.string().optional(),
  currentRound: z.number().int().min(0).optional(),
  half: z.union([z.literal(1), z.literal(2), z.literal('OT')]).optional(),
  c4Planted: z.boolean().optional(),
  teamASide: z.enum(['CT', 'T']).optional(),
  teamBSide: z.enum(['CT', 'T']).optional(),
});

export const TournamentSettingsUpdateSchema = z.object({
  eventName: z.string().optional(),
  gameName: z.string().optional(),
  organizerName: z.string().optional(),
  universityName: z.string().optional(),
  degreeProgramme: z.string().optional(),
  eventDate: z.string().or(z.date()).optional(),
  registrationDeadline: z.string().or(z.date()).optional(),
  eventStatus: z.string().optional(),
  registrationOpen: z.boolean().optional(),
  tournamentFormat: z.string().optional(),
  maximumTeams: z.number().int().positive().optional(),
  announcementText: z.string().optional(),
});

