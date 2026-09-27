import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ScheduleEmailSchema } from '../utils/validators';
import { prisma } from '../utils/prisma';
import { scheduleEmailJob } from '../queues/email.queue';
import { indexEmail, searchEmails } from '../services/elasticsearch.service';
import { logger } from '../utils/logger';

export async function scheduleEmails(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const validationResult = ScheduleEmailSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validationResult.error.errors,
      });
    }

    const { subject, body, recipients, startTime, delayBetweenEmails = 2000, hourlyLimit, senderId } = validationResult.data;
    const targetStartTime = new Date(startTime);
    const nowMs = Date.now();
    const baseStartTimeMs = Math.max(targetStartTime.getTime(), nowMs);
    const stepDelayMs = Math.max(1000, delayBetweenEmails ?? 2000);

    // Get or create sender
    let effectiveSenderId = senderId;
    if (!effectiveSenderId) {
      const defaultSender = await prisma.sender.findFirst({
        where: { userId: req.user.id },
      });
      if (defaultSender) {
        effectiveSenderId = defaultSender.id;
      } else {
        const newSender = await prisma.sender.create({
          data: {
            userId: req.user.id,
            name: req.user.name,
            email: req.user.email,
          },
        });
        effectiveSenderId = newSender.id;
      }
    }

    const createdEmails = [];

    // Schedule email for each recipient with configured delay spacing
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      // Calculate staggered schedule time based on delayBetweenEmails
      const scheduledAt = new Date(baseStartTimeMs + i * stepDelayMs);

      // 1. Create Email record in PostgreSQL
      const email = await prisma.email.create({
        data: {
          userId: req.user.id,
          senderId: effectiveSenderId,
          recipient,
          subject,
          body,
          scheduledAt,
          status: 'scheduled',
          attempts: 0,
        },
      });

      // 2. Deterministic BullMQ Job ID: email-${email.id}
      const bullJobId = `email-${email.id}`;

      // 3. Schedule BullMQ delayed job
      await scheduleEmailJob(email.id, scheduledAt, hourlyLimit);

      // 4. Update bullJobId on PostgreSQL record
      const updatedEmail = await prisma.email.update({
        where: { id: email.id },
        data: { bullJobId },
      });

      // 5. Index in Elasticsearch
      await indexEmail({
        id: updatedEmail.id,
        userId: updatedEmail.userId,
        recipient: updatedEmail.recipient,
        subject: updatedEmail.subject,
        body: updatedEmail.body,
        status: updatedEmail.status,
        scheduledAt: updatedEmail.scheduledAt,
        createdAt: updatedEmail.createdAt,
      });

      createdEmails.push(updatedEmail);
    }

    logger.info(`[SCHEDULE API] Successfully scheduled ${createdEmails.length} emails for user ${req.user.id}`);

    return res.status(201).json({
      success: true,
      message: `Successfully scheduled ${createdEmails.length} email(s).`,
      data: {
        count: createdEmails.length,
        emails: createdEmails,
      },
    });
  } catch (error: any) {
    logger.error(`[SCHEDULE API ERROR] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to schedule emails',
      error: error.message,
    });
  }
}

export async function getScheduledEmails(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const emails = await prisma.email.findMany({
      where: {
        userId: req.user.id,
        status: { in: ['scheduled', 'processing'] },
      },
      orderBy: { scheduledAt: 'asc' },
      include: { sender: true },
    });

    return res.json({
      success: true,
      data: emails,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getSentEmails(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const emails = await prisma.email.findMany({
      where: {
        userId: req.user.id,
        status: { in: ['sent', 'failed'] },
      },
      orderBy: { updatedAt: 'desc' },
      include: { sender: true },
    });

    return res.json({
      success: true,
      data: emails,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getEmailById(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const emailId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const email = await prisma.email.findFirst({
      where: { id: emailId, userId: req.user.id },
      include: { sender: true },
    });

    if (!email) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    return res.json({ success: true, data: email });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function searchEmailController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const q = typeof req.query.q === 'string' ? req.query.q : '';

    // 1. Search Elasticsearch first
    const esResults = await searchEmails(req.user.id, q);

    if (esResults && esResults.length > 0) {
      return res.json({
        success: true,
        source: 'elasticsearch',
        data: esResults,
      });
    }

    // 2. Fallback to PostgreSQL database search if ES has no results or is starting up
    const dbResults = await prisma.email.findMany({
      where: {
        userId: req.user.id,
        OR: [
          { recipient: { contains: q, mode: 'insensitive' } },
          { subject: { contains: q, mode: 'insensitive' } },
          { body: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { sender: true },
    });

    return res.json({
      success: true,
      source: 'database',
      data: dbResults,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
