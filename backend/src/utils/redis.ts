import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

export const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null, // Required by BullMQ
});

redisConnection.on('error', (err) => {
  logger.error(`[REDIS ERROR] Connection issue: ${err.message}`);
});

redisConnection.on('connect', () => {
  logger.info(`[REDIS] Successfully connected to Redis server at ${config.redis.host}:${config.redis.port}`);
});
