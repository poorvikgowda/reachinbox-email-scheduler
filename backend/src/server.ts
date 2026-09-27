import app from './app';
import { config } from './config';
import { initElasticsearch } from './services/elasticsearch.service';
import { createEmailWorker } from './workers/email.worker';
import { prisma } from './utils/prisma';
import { scheduleEmailJob, emailQueue } from './queues/email.queue';
import { logger } from './utils/logger';

async function syncScheduledJobsOnRestart() {
  try {
    logger.info('[RESTART SYNC] Checking PostgreSQL for uncompleted scheduled emails...');

    const pendingEmails = await prisma.email.findMany({
      where: {
        status: 'scheduled',
      },
    });

    logger.info(`[RESTART SYNC] Found ${pendingEmails.length} pending scheduled emails in database.`);

    for (const email of pendingEmails) {
      const bullJobId = email.bullJobId || `email-${email.id}`;
      const existingJob = await emailQueue.getJob(bullJobId);

      if (!existingJob) {
        logger.info(`[RESTART SYNC] Re-scheduling missing BullMQ delayed job for email ${email.id}`);
        await scheduleEmailJob(email.id, email.scheduledAt);
      } else {
        logger.info(`[RESTART SYNC] BullMQ delayed job ${bullJobId} is intact in Redis.`);
      }
    }
  } catch (error: any) {
    logger.error(`[RESTART SYNC ERROR] Failed to sync pending jobs: ${error.message}`);
  }
}

async function startServer() {
  try {
    // 1. Initialize Elasticsearch
    await initElasticsearch();

    // 2. Start BullMQ Email Worker
    const worker = createEmailWorker();
    logger.info(`[WORKER] Email worker started with concurrency = ${config.worker.concurrency}`);

    // 3. Perform restart sync for scheduled emails
    await syncScheduledJobsOnRestart();

    // 4. Start Express Server
    app.listen(config.port, () => {
      logger.info(`[SERVER] ReachInbox Email Scheduler running on port ${config.port}`);
      logger.info(`[SERVER] Bull Board Dashboard available at http://localhost:${config.port}/admin/queues`);
    });
  } catch (error: any) {
    logger.error(`[SERVER FATAL ERROR] Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

startServer();
