import { Router } from 'express';
import { handleLogin, handleLogout, handleGetMe } from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/validateRequest';
import { AdminLoginSchema } from '../utils/validators';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/login', authLimiter, validateRequest(AdminLoginSchema), handleLogin);
router.post('/logout', authenticate, handleLogout);
router.get('/me', authenticate, handleGetMe);

export default router;

