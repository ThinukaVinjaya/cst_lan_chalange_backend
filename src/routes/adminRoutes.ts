import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorizeAdmin } from '../middleware/authorizeAdmin';
import { validateRequest } from '../middleware/validateRequest';
import {
  handleGetAdminRegistrations,
  handleGetAdminRegistrationById,
  handleApproveRegistration,
  handleRejectRegistration,
  handleGetAdminTeams,
  handleGetAdminTeamById,
  handleToggleTeamStatus,
} from '../controllers/teamController';
import {
  handleCreateMatch,
  handleGetMatches,
  handleGetMatchById,
  handleUpdateMatch,
  handleDeleteMatch,
  handleUpdateMatchScore,
  handlePublishMatchScore,
} from '../controllers/matchController';
import {
  handleGetAdminSettings,
  handleUpdateAdminSettings,
} from '../controllers/settingsController';
import {
  handleGetDashboardOverview,
  handleGetDashboardActivity,
} from '../controllers/dashboardController';
import {
  MatchCreateSchema,
  MatchScoreUpdateSchema,
  TournamentSettingsUpdateSchema,
} from '../utils/validators';

const router = Router();

// All routes under /api/admin require authentication
router.use(authenticate);

// 1. Dashboard Overviews
router.get('/dashboard/overview', handleGetDashboardOverview);
router.get('/dashboard/activity', handleGetDashboardActivity);

// 2. Registration Management
router.get('/registrations', handleGetAdminRegistrations);
router.get('/registrations/:id', handleGetAdminRegistrationById);
router.patch('/registrations/:id/approve', handleApproveRegistration);
router.patch('/registrations/:id/reject', handleRejectRegistration);

// 3. Team Management
router.get('/teams', handleGetAdminTeams);
router.get('/teams/:id', handleGetAdminTeamById);
router.patch('/teams/:id/status', handleToggleTeamStatus);

// 4. Match Management & Manual Score Publishing
router.post('/matches', validateRequest(MatchCreateSchema), handleCreateMatch);
router.get('/matches', handleGetMatches);
router.get('/matches/:id', handleGetMatchById);
router.patch('/matches/:id', handleUpdateMatch);
router.delete('/matches/:id', handleDeleteMatch);

// Live Referee scoring desk
router.patch('/matches/:id/score', validateRequest(MatchScoreUpdateSchema), handleUpdateMatchScore);
router.post('/matches/:id/publish', handlePublishMatchScore);

// 5. Tournament Settings & Countdown
router.get('/settings', handleGetAdminSettings);
router.patch(
  '/settings',
  validateRequest(TournamentSettingsUpdateSchema),
  handleUpdateAdminSettings
);

export default router;

