import { Router } from 'express';
import { googleAuthRedirect, googleAuthCallback, getMe, logout } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Google OAuth
router.get('/auth/google', googleAuthRedirect);
router.get('/auth/google/callback', googleAuthCallback);

// User Auth info
router.get('/api/auth/me', requireAuth as any, getMe as any);
router.post('/api/auth/logout', logout);

export default router;
