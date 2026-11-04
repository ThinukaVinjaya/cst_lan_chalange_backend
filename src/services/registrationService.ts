import crypto from 'crypto';
import mongoose from 'mongoose';
import { Registration, IRegistration } from '../models/Registration';
import { Team } from '../models/Team';
import { TournamentSettings } from '../models/TournamentSettings';
import { ApiError } from '../utils/ApiError';
import { uploadTeamLogo } from './cloudinaryService';

export interface SubmitRegistrationDTO {
  teamName: string;
  teamTag: string;
  university?: string;
  captain: {
    name: string;
    whatsappNumber?: string;
    phone?: string;
    faculty?: string;
    email?: string;
  };
  players: Array<{
    fullName: string;
    faculty: string;
    inGameName?: string;
    steamId?: string;
    email?: string;
    role?: string;
  }>;
  teamLogo?: string;
}

export const submitRegistration = async (
  data: SubmitRegistrationDTO,
  fileBuffer?: Buffer,
  ipAddress?: string
): Promise<{ registration: IRegistration; confirmationCode: string }> => {
  if (mongoose.connection.readyState !== 1) {
    const codeSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const registrationNumber = `REG-2026-${codeSuffix}`;
    const demoRegistration = {
      registrationNumber,
      teamName: data.teamName.trim(),
      teamTag: data.teamTag.trim().toUpperCase(),
      teamLogo: data.teamLogo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
      university: data.university || 'Uva Wellassa University of Sri Lanka',
      captain: data.captain,
      players: data.players,
      status: 'PENDING',
      createdAt: new Date(),
    } as any;
    return {
      registration: demoRegistration,
      confirmationCode: registrationNumber,
    };
  }

  // 1. Check if registrations are open
  const settings = await TournamentSettings.findOne();
  if (settings && !settings.registrationOpen) {
    throw ApiError.badRequest('Tournament registrations are currently closed by administration.');
  }

  const teamNameClean = data.teamName.trim();
  const teamTagClean = data.teamTag.trim().toUpperCase();
  const whatsappNum = (data.captain.whatsappNumber || data.captain.phone || '').trim();

  // 2. Prevent duplicate team name or tag in active or approved registrations / teams
  const duplicateName = await Registration.findOne({
    teamName: { $regex: new RegExp(`^${teamNameClean}$`, 'i') },
    status: { $in: ['PENDING', 'APPROVED'] },
  });
  if (duplicateName) {
    throw ApiError.conflict(`A squad with name "${teamNameClean}" is already registered or approved.`);
  }

  const duplicateTag = await Registration.findOne({
    teamTag: teamTagClean,
    status: { $in: ['PENDING', 'APPROVED'] },
  });
  if (duplicateTag) {
    throw ApiError.conflict(`The team tag [${teamTagClean}] is already in use.`);
  }

  // 3. Prevent same Steam ID on multiple active teams (if Steam IDs are provided)
  const submittedSteamIds = data.players
    .map((p) => (p.steamId || '').trim().toLowerCase())
    .filter(Boolean);

  if (submittedSteamIds.length > 0) {
    const existingActiveRoster = await Team.findOne({
      isActive: true,
      'players.steamId': { $in: submittedSteamIds },
    });

    if (existingActiveRoster) {
      throw ApiError.conflict(
        'One or more player Steam IDs are already registered to an approved active squad.'
      );
    }
  }

  // 4. Handle logo upload (Cloudinary or base64 or fallback)
  let logoUrl = data.teamLogo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80';
  let logoPublicId: string | undefined;

  if (fileBuffer) {
    const uploadResult = await uploadTeamLogo(fileBuffer, undefined, teamTagClean);
    logoUrl = uploadResult.secure_url;
    logoPublicId = uploadResult.public_id;
  } else if (data.teamLogo && data.teamLogo.startsWith('data:image')) {
    const uploadResult = await uploadTeamLogo(undefined, data.teamLogo, teamTagClean);
    logoUrl = uploadResult.secure_url;
    logoPublicId = uploadResult.public_id;
  }

  // 5. Generate unique reference code (e.g. REG-2026-A1B2)
  const codeSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const registrationNumber = `REG-2026-${codeSuffix}`;

  // 6. Persist Registration as PENDING
  const registration = await Registration.create({
    registrationNumber,
    teamName: teamNameClean,
    teamTag: teamTagClean,
    teamLogo: logoUrl,
    logoPublicId,
    university: (data.university || 'Uva Wellassa University of Sri Lanka').trim(),
    captain: {
      name: data.captain.name.trim(),
      whatsappNumber: whatsappNum,
      faculty: data.captain.faculty?.trim() || data.players[0]?.faculty?.trim() || 'Faculty of Applied Sciences',
      email: data.captain.email?.trim().toLowerCase() || '',
      phone: whatsappNum,
    },
    players: data.players.map((p) => ({
      fullName: p.fullName.trim(),
      faculty: p.faculty.trim(),
      inGameName: (p.inGameName || '').trim(),
      steamId: (p.steamId || '').trim(),
      email: p.email?.trim().toLowerCase() || '',
      role: p.role || 'PLAYER',
    })),
    status: 'PENDING',
    ipAddress,
  });

  return {
    registration,
    confirmationCode: registrationNumber,
  };
};

export const getPublicRegistration = async (idOrNumber: string) => {
  if (mongoose.connection.readyState !== 1) {
    return {
      id: 'reg-demo-id',
      registrationNumber: idOrNumber.startsWith('REG-') ? idOrNumber : 'REG-2026-DEMO',
      teamName: 'UWU CST Vanguard',
      teamTag: 'CST.VAN',
      teamLogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
      university: 'Uva Wellassa University of Sri Lanka',
      captainName: 'Kasun Bandara',
      players: [
        { fullName: 'Kasun Bandara', faculty: 'Faculty of Applied Sciences', inGameName: '', role: 'CAPTAIN' },
      ],
      status: 'PENDING',
      createdAt: new Date(),
    };
  }

  const query = idOrNumber.startsWith('REG-')
    ? { registrationNumber: idOrNumber }
    : { _id: idOrNumber };

  const reg = await Registration.findOne(query);
  if (!reg) {
    throw ApiError.notFound('Registration reference not found.');
  }

  // Public DTO: never expose private emails or phone numbers
  return {
    id: reg._id,
    registrationNumber: reg.registrationNumber,
    teamName: reg.teamName,
    teamTag: reg.teamTag,
    teamLogo: reg.teamLogo,
    university: reg.university,
    captainName: reg.captain.name,
    players: reg.players.map((p) => ({
      fullName: p.fullName,
      faculty: p.faculty,
      inGameName: p.inGameName || '',
      role: p.role || 'PLAYER',
    })),
    status: reg.status,
    createdAt: reg.createdAt,
  };
};

