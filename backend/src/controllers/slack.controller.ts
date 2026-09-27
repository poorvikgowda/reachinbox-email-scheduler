import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

export async function slackAuthRedirect(req: Request, res: Response) {
  // Carry the JWT token as OAuth state so the callback can identify the user
  const jwtToken = req.cookies.jwt || (req.headers.authorization?.split(' ')[1]) || '';

  // Treat placeholder values the same as missing/mock for dev bypass
  const isRealSlack = config.slack.clientId &&
    !config.slack.clientId.includes('mock') &&
    !config.slack.clientId.includes('your_slack');

  if (!isRealSlack) {
    logger.warn('[SLACK] No real Slack Client ID configured. Cannot initiate real OAuth.');
    return res.redirect(`${config.frontendUrl}/dashboard?slack_error=no_client_id`);
  }

  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?` +
    `client_id=${encodeURIComponent(config.slack.clientId)}` +
    `&scope=${encodeURIComponent('chat:write,channels:read,chat:write.public')}` +
    `&redirect_uri=${encodeURIComponent(config.slack.redirectUri)}` +
    `&state=${encodeURIComponent(jwtToken)}`;

  logger.info(`[SLACK] Redirecting to Slack OAuth. redirect_uri=${config.slack.redirectUri}`);
  return res.redirect(slackAuthUrl);
}

export async function slackAuthCallback(req: Request, res: Response) {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect(`${config.frontendUrl}/dashboard?slack_error=missing_code`);
    }

    // Exchange authorization code for access token
    const tokenRes = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        code,
        redirect_uri: config.slack.redirectUri,
      },
    });

    if (!tokenRes.data.ok) {
      logger.error(`[SLACK OAUTH ERROR] Token exchange failed: ${tokenRes.data.error}`);
      return res.redirect(`${config.frontendUrl}/dashboard?slack_error=${tokenRes.data.error}`);
    }

    const slackAccessToken: string = tokenRes.data.access_token;
    const slackTeamId: string = tokenRes.data.team?.id || 'unknown';
    const slackTeamName: string = tokenRes.data.team?.name || '';

    // Identify the correct ReachInbox user from the JWT state param
    let user = null;
    const jwtToken = typeof state === 'string' ? state : '';
    if (jwtToken) {
      try {
        const { verifyToken } = await import('../auth/jwt');
        const decoded = verifyToken(jwtToken);
        user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      } catch (jwtErr: any) {
        logger.warn(`[SLACK] Could not verify JWT from state: ${jwtErr.message}`);
      }
    }

    // Fallback: most recently updated user (single-tenant dev mode)
    if (!user) {
      user = await prisma.user.findFirst({ orderBy: { updatedAt: 'desc' } });
    }

    if (!user) {
      logger.error('[SLACK] No user found to associate Slack connection with.');
      return res.redirect(`${config.frontendUrl}/dashboard?slack_error=user_not_found`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        slackAccessToken,
        slackTeamId,
        slackConnected: true,
      },
    });

    logger.info(`[SLACK] Connected Slack workspace '${slackTeamName}' (${slackTeamId}) for user ${user.id} (${user.email})`);
    return res.redirect(`${config.frontendUrl}/dashboard?slack=connected`);
  } catch (error: any) {
    logger.error(`[SLACK CALLBACK ERROR] ${error.message}`);
    return res.redirect(`${config.frontendUrl}/dashboard?slack_error=connection_failed`);
  }
}

export async function getSlackStatus(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      slackConnected: true,
      slackTeamId: true,
    },
  });

  return res.json({
    success: true,
    data: {
      slackConnected: user?.slackConnected || false,
      slackTeamId: user?.slackTeamId || null,
    },
  });
}

export async function disconnectSlack(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      slackAccessToken: null,
      slackTeamId: null,
      slackConnected: false,
    },
  });

  logger.info(`[SLACK] Disconnected Slack account for user ${req.user.id}`);

  return res.json({
    success: true,
    message: 'Slack disconnected successfully',
  });
}
