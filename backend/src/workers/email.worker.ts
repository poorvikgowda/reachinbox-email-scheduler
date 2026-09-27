import { Worker, Job } from 'bullmq';
import { redisConnection } from '../utils/redis';
import { prisma } from '../utils/prisma';
import { sendEmail } from '../services/email.service';
import { acquireSendSlot, calculateNextAvailableTime } from '../services/rate-limit.service';
import { sendSlackRateLimitNotification } from '../services/slack.service';
import { indexEmail } from '../services/elasticsearch.service';
import { scheduleEmailJob, QUEUE_NAME, EmailJobData } from '../queues/email.queue';
import { config } from '../config';
import { logger } from '../utils/logger';

export function createEmailWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId } = job.data;
      logger.emailJob(job.id || emailId, 'started', `processing emailId ${emailId}`);

      // 1. Fetch Email from Database
      const email = await prisma.email.findUnique({
        where: { id: emailId },
        include: { sender: true },
      });

      if (!email) {
        logger.warn(`[WORKER] Email record ${emailId} not found. Skipping.`);
        return;
      }

      // 2. Idempotency Check: If already sent, skip immediately
      if (email.status === 'sent') {
        logger.emailJob(job.id || emailId, 'already_sent', email.recipient);
        return;
      }

      // 3. Atomic State Transition: scheduled -> processing
      // Prevents concurrent workers from processing the same email twice
      const claimResult = await prisma.email.updateMany({
        where: {
          id: emailId,
          status: { in: ['scheduled', 'failed'] }, // allow retry if previously failed
        },
        data: {
          status: 'processing',
        },
      });

      if (claimResult.count === 0) {
        logger.warn(`[WORKER] Could not claim email ${emailId}. Current status is not 'scheduled' or 'failed'. Skipping.`);
        return;
      }

      // 4. Rate Limiting Check
      // Use the per-campaign limit from the job payload when supplied;
      // otherwise fall back to the global MAX_EMAILS_PER_HOUR env setting.
      const senderKey = email.senderId || email.userId;
      const effectiveLimit = job.data.hourlyLimit ?? config.worker.maxEmailsPerHour;
      const rateLimitResult = await acquireSendSlot(senderKey, effectiveLimit);

      if (!rateLimitResult.allowed) {
        logger.warn(`[WORKER RATE LIMIT HIT] Sender ${senderKey} hit hourly limit (${rateLimitResult.currentCount}/${rateLimitResult.maxLimit}). Rescheduling email ${emailId}`);

        // Send Slack notification (deduplicated)
        await sendSlackRateLimitNotification(
          email.userId,
          email.sender?.email || 'default-sender@reachinbox.ai',
          rateLimitResult.maxLimit,
          rateLimitResult.currentCount,
          rateLimitResult.hourWindow
        );

        // Reschedule to next available hour window
        const nextTime = calculateNextAvailableTime();

        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'scheduled',
            scheduledAt: nextTime,
          },
        });

        // Add delayed job to queue for next hour window;
        // forward the same per-campaign limit so it is re-checked next window.
        await scheduleEmailJob(emailId, nextTime, job.data.hourlyLimit);

        logger.info(`[WORKER RESCHEDULED] Email ${emailId} rescheduled for ${nextTime.toISOString()}`);
        return;
      }

      // 5. Minimum Email Delay Throttling
      if (config.worker.minDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, config.worker.minDelayMs));
      }

      // 6. Send Email via Ethereal SMTP
      try {
        const senderEmail = email.sender?.email || 'outreach@reachinbox.ai';
        const sendResult = await sendEmail({
          from: `"${email.sender?.name || 'ReachInbox Outreach'}" <${senderEmail}>`,
          to: email.recipient,
          subject: email.subject,
          body: email.body,
        });

        // 7. Atomic Transition: processing -> sent
        const updatedEmail = await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'sent',
            sentAt: new Date(),
            messageId: sendResult.messageId,
          },
        });

        logger.emailJob(job.id || emailId, 'sent', email.recipient, {
          messageId: sendResult.messageId,
          previewUrl: sendResult.previewUrl,
        });

        // 8. Index in Elasticsearch
        await indexEmail({
          id: updatedEmail.id,
          userId: updatedEmail.userId,
          recipient: updatedEmail.recipient,
          subject: updatedEmail.subject,
          body: updatedEmail.body,
          status: updatedEmail.status,
          scheduledAt: updatedEmail.scheduledAt,
          sentAt: updatedEmail.sentAt,
          createdAt: updatedEmail.createdAt,
        });
      } catch (err: any) {
        logger.error(`[WORKER ERROR] Failed to send email ${emailId}: ${err.message}`);

        // Update DB state to failed
        const failedEmail = await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'failed',
            errorMessage: err.message,
            attempts: { increment: 1 },
          },
        });

        // Index failure in Elasticsearch
        await indexEmail({
          id: failedEmail.id,
          userId: failedEmail.userId,
          recipient: failedEmail.recipient,
          subject: failedEmail.subject,
          body: failedEmail.body,
          status: failedEmail.status,
          scheduledAt: failedEmail.scheduledAt,
          createdAt: failedEmail.createdAt,
        });

        throw err; // Re-throw to allow BullMQ to handle job retries if configured
      }
    },
    {
      connection: redisConnection,
      concurrency: config.worker.concurrency,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`[WORKER JOB COMPLETED] Job ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[WORKER JOB FAILED] Job ${job?.id}: ${err.message}`);
  });

  return worker;
}
