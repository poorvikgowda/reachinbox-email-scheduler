import { Router } from 'express';
import { slackAuthRedirect, slackAuthCallback, getSlackStatus, disconnectSlack } from '../controllers/slack.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Slack OAuth
router.get('/auth/slack', slackAuthRedirect);
router.get('/auth/slack/callback', slackAuthCallback);

// Slack Status & Management APIs
router.get('/api/slack/status', requireAuth as any, getSlackStatus as any);
router.post('/api/slack/disconnect', requireAuth as any, disconnectSlack as any);

export default router;
