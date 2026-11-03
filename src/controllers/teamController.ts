import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Registration } from '../models/Registration';
import { Team } from '../models/Team';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { recordAudit } from '../services/auditService';

// Admin: Get all registrations with search, filter, pagination
export const handleGetAdminRegistrations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search, status, page = '1', limit = '20' } = req.query;

    const filter: Record<string, any> = {};

    if (status && status !== 'all') {
      filter.status = (status as string).toUpperCase();
    }

    if (search) {
      const q = (search as string).trim();
      filter.$or = [
        { teamName: { $regex: q, $options: 'i' } },
        { teamTag: { $regex: q, $options: 'i' } },
        { university: { $regex: q, $options: 'i' } },
        { 'captain.name': { $regex: q, $options: 'i' } },
        { 'players.ign': { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [registrations, total] = await Promise.all([
      Registration.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Registration.countDocuments(filter),
    ]);

    ApiResponse.send(res, 200, 'Registrations retrieved', registrations, {
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get single registration by ID
export const handleGetAdminRegistrationById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const registration = await Registration.findById(id);
    if (!registration) {
      throw ApiError.notFound('Registration not found');
    }
    ApiResponse.send(res, 200, 'Registration retrieved', registration);
  } catch (error) {
    next(error);
  }
};

// Admin: Approve registration -> Create Team record
export const handleApproveRegistration = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const registration = await Registration.findById(id);

    if (!registration) {
      throw ApiError.notFound('Registration not found');
    }

    if (registration.status === 'APPROVED') {
      throw ApiError.badRequest('This squad registration has already been approved.');
    }

    // Verify no duplicate team name or tag exists in official teams
    const existingTeam = await Team.findOne({
      $or: [{ teamName: registration.teamName }, { teamTag: registration.teamTag }],
      registrationId: { $ne: registration._id },
    });

    if (existingTeam) {
      throw ApiError.conflict(
        `A participating team with name "${existingTeam.teamName}" or tag [${existingTeam.teamTag}] already exists.`
      );
    }

    // Upsert or create Team record
    let team = await Team.findOne({ registrationId: registration._id });
    if (!team) {
      team = await Team.create({
        teamName: registration.teamName,
        teamTag: registration.teamTag,
        teamLogo: registration.teamLogo,
        logoPublicId: registration.logoPublicId,
        university: registration.university,
        captain: registration.captain,
        players: registration.players,
        substitute: registration.substitute,
        registrationId: registration._id,
        isActive: true,
      });
    } else {
      team.isActive = true;
      await team.save();
    }

    // Update registration status
    registration.status = 'APPROVED';
    registration.reviewedBy = req.admin?._id;
    registration.reviewedAt = new Date();
    await registration.save();

    await recordAudit({
      adminId: req.admin?._id,
      adminUsername: req.admin?.username || 'admin',
      action: 'APPROVE_REGISTRATION',
      resourceType: 'Registration',
      resourceId: (registration._id as any).toString(),
      details: { teamId: team._id, teamName: team.teamName, teamTag: team.teamTag },
      req,
    });

    ApiResponse.send(res, 200, `Squad [${team.teamTag}] ${team.teamName} approved successfully`, {
      registration,
      team,
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Reject registration with reason
export const handleRejectRegistration = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason = 'Roster requirements or student eligibility criteria not met' } = req.body;

    const registration = await Registration.findById(id);
    if (!registration) {
      throw ApiError.notFound('Registration not found');
    }

    registration.status = 'REJECTED';
    registration.rejectionReason = reason;
    registration.reviewedBy = req.admin?._id;
    registration.reviewedAt = new Date();
    await registration.save();

    // Deactivate Team record if it previously existed
    await Team.updateOne({ registrationId: registration._id }, { isActive: false });

    await recordAudit({
      adminId: req.admin?._id,
      adminUsername: req.admin?.username || 'admin',
      action: 'REJECT_REGISTRATION',
      resourceType: 'Registration',
      resourceId: (registration._id as any).toString(),
      details: { reason },
      req,
    });

    ApiResponse.send(res, 200, `Registration rejected: ${reason}`, registration);
  } catch (error) {
    next(error);
  }
};

// Admin: Get all participating teams
export const handleGetAdminTeams = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search, active } = req.query;
    const filter: Record<string, any> = {};

    if (active !== undefined && active !== 'all') {
      filter.isActive = active === 'true';
    }

    if (search) {
      const q = (search as string).trim();
      filter.$or = [
        { teamName: { $regex: q, $options: 'i' } },
        { teamTag: { $regex: q, $options: 'i' } },
        { university: { $regex: q, $options: 'i' } },
        { 'captain.name': { $regex: q, $options: 'i' } },
      ];
    }

    const teams = await Team.find(filter).sort({ points: -1, roundDiff: -1, teamName: 1 });
    ApiResponse.send(res, 200, 'Teams retrieved', teams);
  } catch (error) {
    next(error);
  }
};

// Admin: Get single team details
export const handleGetAdminTeamById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const team = await Team.findById(id);
    if (!team) {
      throw ApiError.notFound('Team not found');
    }
    ApiResponse.send(res, 200, 'Team retrieved', team);
  } catch (error) {
    next(error);
  }
};

// Admin: Toggle team active status
export const handleToggleTeamStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const team = await Team.findById(id);
    if (!team) {
      throw ApiError.notFound('Team not found');
    }

    team.isActive = isActive !== undefined ? !!isActive : !team.isActive;
    await team.save();

    await recordAudit({
      adminId: req.admin?._id,
      adminUsername: req.admin?.username || 'admin',
      action: team.isActive ? 'ACTIVATE_TEAM' : 'DEACTIVATE_TEAM',
      resourceType: 'Team',
      resourceId: (team._id as any).toString(),
      details: { isActive: team.isActive },
      req,
    });

    ApiResponse.send(res, 200, `Team ${team.isActive ? 'activated' : 'deactivated'}`, team);
  } catch (error) {
    next(error);
  }
};

