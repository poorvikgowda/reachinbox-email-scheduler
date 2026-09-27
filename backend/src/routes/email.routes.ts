import { Router } from 'express';
import {
  scheduleEmails,
  getScheduledEmails,
  getSentEmails,
  getEmailById,
  searchEmailController,
} from '../controllers/email.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth as any);

router.post('/api/emails/schedule', scheduleEmails as any);
router.get('/api/emails/scheduled', getScheduledEmails as any);
router.get('/api/emails/sent', getSentEmails as any);
router.get('/api/emails/search', searchEmailController as any);
router.get('/api/emails/:id', getEmailById as any);

export default router;
