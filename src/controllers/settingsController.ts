import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { TournamentSettings } from '../models/TournamentSettings';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { recordAudit } from '../services/auditService';

const DEFAULT_SETTINGS = {
  eventName: 'CST LAN Challenge 2026',
  gameName: 'Counter-Strike 2',
  organizerName: 'Computer Science and Technology Degree Programme',
  universityName: 'Uva Wellassa University of Sri Lanka',
  degreeProgramme: 'Computer Science and Technology',
  eventDate: new Date('2026-11-20T09:00:00.000Z'),
  registrationDeadline: new Date('2026-11-12T23:59:59.000Z'),
  eventStatus: 'REGISTRATIONS OPEN',
  registrationOpen: true,
  tournamentFormat: '5v5 Competitive CS2 (MR12 Format)',
  maximumTeams: 16,
  announcementText:
    'LAN Finals live at Uva Wellassa University Main Auditorium. 5v5 MR12 Counter-Strike 2 competitive ruleset.',
  livestreamUrl: 'https://twitch.tv/cst_lan_challenge',
};

// Ensure default settings exist in database
export const getOrCreateSettings = async () => {
  if (mongoose.connection.readyState !== 1) {
    return DEFAULT_SETTINGS as any;
  }
  let settings = await TournamentSettings.findOne();
  if (!settings) {
    settings = await TournamentSettings.create(DEFAULT_SETTINGS);
  }
  return settings;
};

// Public read-only settings
export const handleGetPublicSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await getOrCreateSettings();
    ApiResponse.send(res, 200, 'Tournament settings retrieved', {
      eventName: settings.eventName,
      gameName: settings.gameName,
      organizerName: settings.organizerName,
      universityName: settings.universityName,
      degreeProgramme: settings.degreeProgramme,
      eventDate: settings.eventDate,
      registrationDeadline: settings.registrationDeadline,
      eventStatus: settings.eventStatus,
      registrationOpen: settings.registrationOpen,
      tournamentFormat: settings.tournamentFormat,
      announcementText: settings.announcementText,
      livestreamUrl: settings.livestreamUrl,
    });
  } catch (error) {
    next(error);
  }
};

// Admin get settings
export const handleGetAdminSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await getOrCreateSettings();
    ApiResponse.send(res, 200, 'Admin tournament settings', settings);
  } catch (error) {
    next(error);
  }
};

// Admin update settings
export const handleUpdateAdminSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await getOrCreateSettings();
    const updates = req.body;

    if (updates.eventDate) {
      settings.eventDate = new Date(updates.eventDate);
    }
    if (updates.registrationDeadline) {
      settings.registrationDeadline = new Date(updates.registrationDeadline);
    }
    if (updates.eventName !== undefined) settings.eventName = updates.eventName;
    if (updates.gameName !== undefined) settings.gameName = updates.gameName;
    if (updates.organizerName !== undefined) settings.organizerName = updates.organizerName;
    if (updates.universityName !== undefined) settings.universityName = updates.universityName;
    if (updates.degreeProgramme !== undefined) settings.degreeProgramme = updates.degreeProgramme;
    if (updates.eventStatus !== undefined) settings.eventStatus = updates.eventStatus;
    if (updates.registrationOpen !== undefined) settings.registrationOpen = updates.registrationOpen;
    if (updates.tournamentFormat !== undefined) settings.tournamentFormat = updates.tournamentFormat;
    if (updates.maximumTeams !== undefined) settings.maximumTeams = updates.maximumTeams;
    if (updates.announcementText !== undefined) settings.announcementText = updates.announcementText;
    if (updates.livestreamUrl !== undefined) settings.livestreamUrl = updates.livestreamUrl;

    await settings.save();

    await recordAudit({
      adminId: req.admin?._id,
      adminUsername: req.admin?.username || 'admin',
      action: 'UPDATE_TOURNAMENT_SETTINGS',
      resourceType: 'TournamentSettings',
      resourceId: (settings._id as any).toString(),
      details: updates,
      req,
    });

    ApiResponse.send(res, 200, 'Tournament settings updated successfully', settings);
  } catch (error) {
    next(error);
  }
};
