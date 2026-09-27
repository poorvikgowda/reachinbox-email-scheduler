import { redisConnection } from '../utils/redis';
import { config } from '../config';

export function getHourWindow(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  return `${year}-${month}-${day}-${hour}`;
}

export function calculateNextAvailableTime(fromDate: Date = new Date()): Date {
  const nextHour = new Date(fromDate);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
  return nextHour;
}

export interface SlotResult {
  allowed: boolean;
  currentCount: number;
  hourWindow: string;
  maxLimit: number;
}

export async function acquireSendSlot(
  senderId: string,
  maxLimit: number = config.worker.maxEmailsPerHour
): Promise<SlotResult> {
  const now = new Date();
  const hourWindow = getHourWindow(now);
  const redisKey = `email-rate:${senderId}:${hourWindow}`;

  const currentCount = await redisConnection.incr(redisKey);

  if (currentCount === 1) {
    // Set expiration to 1 hour (3600 seconds)
    await redisConnection.expire(redisKey, 3600);
  }

  if (currentCount <= maxLimit) {
    return {
      allowed: true,
      currentCount,
      hourWindow,
      maxLimit,
    };
  } else {
    // Limit exceeded for this window. Rollback atomic increment or keep it tracked
    return {
      allowed: false,
      currentCount,
      hourWindow,
      maxLimit,
    };
  }
}
