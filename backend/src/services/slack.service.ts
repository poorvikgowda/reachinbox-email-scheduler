import axios from 'axios';
import { prisma } from '../utils/prisma';
import { redisConnection } from '../utils/redis';
import { config } from '../config';
import { logger } from '../utils/logger';

export async function sendSlackRateLimitNotification(
  userId: string,
  senderEmail: string,
  hourlyLimit: number,
  currentUsage: number,
  hourWindow: string
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.slackConnected || !user.slackAccessToken) {
      logger.info(`[SLACK] User ${userId} does not have an active Slack connection. Skipping notification.`);
      return;
    }

    // Deduplicate Slack alert for the same sender and hour window
    const redisKey = `slack-alert:${senderEmail}:${hourWindow}`;
    const alreadySent = await redisConnection.get(redisKey);
    if (alreadySent) {
      logger.info(`[SLACK] Notification already sent for ${senderEmail} in window ${hourWindow}. Skipping.`);
      return;
    }

    const messageText = `⚠️ *Email hourly rate limit reached.*

*Sender:* ${senderEmail}
*Limit:* ${hourlyLimit} emails/hour
*Current usage:* ${currentUsage}/${hourlyLimit}

Remaining emails have been automatically rescheduled for the next available hour.`;

    // Attempt to post message to user's Slack.
    // We get channels or post to general / user channel, or use chat.postMessage
    // Standard bot token allows posting to channel or user's default conversation.
    // First, list conversations to find a channel (like #general) or post directly.
    const channelsRes = await axios.get('https://slack.com/api/conversations.list', {
      headers: { Authorization: `Bearer ${user.slackAccessToken}` },
    });

    let channelId = '';
    if (channelsRes.data.ok && channelsRes.data.channels && channelsRes.data.channels.length > 0) {
      // Pick first public channel user/bot is in, or first available channel
      const publicChannel = channelsRes.data.channels.find((c: any) => c.is_channel || c.name === 'general') || channelsRes.data.channels[0];
      channelId = publicChannel.id;
    }

    if (channelId) {
      const postRes = await axios.post(
        'https://slack.com/api/chat.postMessage',
        {
          channel: channelId,
          text: messageText,
        },
        {
          headers: { Authorization: `Bearer ${user.slackAccessToken}` },
        }
      );

      if (postRes.data.ok) {
        logger.info(`[SLACK] Delivered rate limit alert to channel ${channelId} for sender ${senderEmail}`);
        // Mark alert as sent for 1 hour (3600s)
        await redisConnection.set(redisKey, 'true', 'EX', 3600);
      } else {
        logger.error(`[SLACK ERROR] Failed to post message: ${postRes.data.error}`);
      }
    } else {
      logger.warn(`[SLACK] No suitable Slack channel found for user ${userId} to post rate limit notification.`);
    }
  } catch (error: any) {
    logger.error(`[SLACK ERROR] Error sending rate limit notification: ${error.message}`);
  }
}
