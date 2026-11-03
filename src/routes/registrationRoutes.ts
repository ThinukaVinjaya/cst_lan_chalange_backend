import { Router } from 'express';
import {
  handleRegistrationSubmit,
  handleGetRegistrationStatus,
} from '../controllers/registrationController';
import { uploadLogo } from '../middleware/upload';
import { registrationLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post(
  '/',
  registrationLimiter,
  uploadLogo.single('logo'),
  handleRegistrationSubmit
);

router.get('/:id', handleGetRegistrationStatus);

export default router;

