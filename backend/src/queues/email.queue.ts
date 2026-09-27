import { Queue } from 'bullmq';
import { redisConnection } from '../utils/redis';
import { logger } from '../utils/logger';

export const QUEUE_NAME = 'email-queue';

/** Shape of data stored inside every BullMQ email job. */
export interface EmailJobData {
  emailId: string;
  /** Per-campaign hourly send limit set by the user in the UI.
   *  Undefined means fall back to MAX_EMAILS_PER_HOUR env var. */
  hourlyLimit?: number;
}

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export async function scheduleEmailJob(
  emailId: string,
  scheduledAt: Date,
  hourlyLimit?: number,
) {
  const jobId = `email-${emailId}`;
  const now = Date.now();
  const delay = Math.max(0, scheduledAt.getTime() - now);

  logger.info(`[QUEUE] Scheduling email job ${jobId} with delay ${delay}ms (target time: ${scheduledAt.toISOString()})`);

  const jobData: EmailJobData = { emailId };
  if (hourlyLimit !== undefined) {
    jobData.hourlyLimit = hourlyLimit;
  }

  const job = await emailQueue.add(
    'send-email',
    jobData,
    {
      jobId,
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );

  return job;
}

