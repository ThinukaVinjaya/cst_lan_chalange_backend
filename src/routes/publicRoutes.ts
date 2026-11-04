import { Router } from 'express';
import { handleGetPublicSettings } from '../controllers/settingsController';
import {
  handleGetPublicScoreboard,
  handleGetPublicStandings,
  handleGetPublicTeams,
  handleGetPublicTeamById,
} from '../controllers/scoreboardController';
import {
  handleGetMatches,
  handleGetMatchById,
  handleGetPlayoffBracket,
} from '../controllers/matchController';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply general traffic limiter to public endpoints
router.use(generalLimiter);

router.get('/settings', handleGetPublicSettings);
router.get('/teams', handleGetPublicTeams);
router.get('/teams/:id', handleGetPublicTeamById);
router.get('/matches', handleGetMatches);
router.get('/matches/bracket', handleGetPlayoffBracket);
router.get('/matches/:id', handleGetMatchById);
router.get('/scoreboard', handleGetPublicScoreboard);
router.get('/standings', handleGetPublicStandings);

export default router;

