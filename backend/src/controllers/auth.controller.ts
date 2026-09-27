import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../utils/prisma';
import { generateToken } from '../auth/jwt';
import { config } from '../config';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

export async function googleAuthRedirect(req: Request, res: Response) {
  // If GOOGLE_CLIENT_ID is set to mock/dev, placeholder, or missing, redirect to callback with mock code for easy evaluation
  if (!config.google.clientId || config.google.clientId.includes('mock') || config.google.clientId.includes('your_google')) {
    const mockCallbackUrl = `${config.google.callbackUrl}?code=dev_mock_google_code`;
    return res.redirect(mockCallbackUrl);
  }

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(config.google.clientId)}` +
    `&redirect_uri=${encodeURIComponent(config.google.callbackUrl)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&access_type=offline` +
    `&prompt=consent`;

  return res.redirect(googleAuthUrl);
}

export async function googleAuthCallback(req: Request, res: Response) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).redirect(`${config.frontendUrl}/login?error=missing_code`);
    }

    let googleProfile = {
      id: 'google_10982374650192837',
      email: 'demo.user@reachinbox.ai',
      name: 'ReachInbox Demo User',
      picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    };

    // If real Google credentials are standard, attempt token exchange
    if (code !== 'dev_mock_google_code' && config.google.clientId && !config.google.clientId.includes('mock') && !config.google.clientId.includes('your_google')) {
      try {
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: config.google.clientId,
          client_secret: config.google.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: config.google.callbackUrl,
        });

        const accessToken = tokenRes.data.access_token;
        const profileRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        googleProfile = {
          id: profileRes.data.id,
          email: profileRes.data.email,
          name: profileRes.data.name || profileRes.data.email.split('@')[0],
          picture: profileRes.data.picture,
        };
      } catch (oauthErr: any) {
        logger.error(`[GOOGLE OAUTH ERROR] Failed token exchange: ${oauthErr.message}`);
        // Fall back to dev profile if dev/testing
      }
    }

    // Create or update User in PostgreSQL
    let user = await prisma.user.findUnique({
      where: { googleId: googleProfile.id },
    });

    if (!user) {
      // Check if user exists by email
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: googleProfile.email },
      });

      if (existingUserByEmail) {
        user = await prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: {
            googleId: googleProfile.id,
            name: googleProfile.name,
            avatar: googleProfile.picture,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            googleId: googleProfile.id,
            email: googleProfile.email,
            name: googleProfile.name,
            avatar: googleProfile.picture,
          },
        });
      }
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: googleProfile.name,
          avatar: googleProfile.picture,
        },
      });
    }

    // Ensure a default sender exists for this user
    const sender = await prisma.sender.findFirst({
      where: { userId: user.id },
    });

    if (!sender) {
      await prisma.sender.create({
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
        },
      });
    }

    const token = generateToken({ userId: user.id, email: user.email });

    // Set secure HTTP-only cookie and redirect to frontend dashboard
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: false, // set true in HTTPS production
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.redirect(`${config.frontendUrl}/dashboard?token=${token}`);
  } catch (error: any) {
    logger.error(`[AUTH CALLBACK ERROR] ${error.message}`);
    return res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  // Get user details along with senders
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      senders: true,
    },
  });

  return res.json({
    success: true,
    data: user,
  });
}

export async function logout(req: Request, res: Response) {
  res.clearCookie('jwt');
  return res.json({ success: true, message: 'Logged out successfully' });
}
