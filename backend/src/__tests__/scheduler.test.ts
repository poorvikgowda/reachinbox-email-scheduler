import { describe, test, expect, afterAll, beforeEach } from '@jest/globals';
import { calculateNextAvailableTime, getHourWindow, acquireSendSlot } from '../services/rate-limit.service';
import { ScheduleEmailSchema } from '../utils/validators';
import { redisConnection } from '../utils/redis';

describe('Email Job Scheduler - Core Logic Tests', () => {
  afterAll(async () => {
    await redisConnection.quit();
  });

  describe('Rate Limiter Helper', () => {
    test('calculateNextAvailableTime returns top of the next hour', () => {
      const fixedDate = new Date('2026-09-27T10:15:30.000Z');
      const nextHour = calculateNextAvailableTime(fixedDate);

      expect(nextHour.toISOString()).toBe('2026-09-27T11:00:00.000Z');
    });

    test('getHourWindow generates accurate UTC window string', () => {
      const fixedDate = new Date('2026-09-27T14:45:00.000Z');
      const windowStr = getHourWindow(fixedDate);

      expect(windowStr).toBe('2026-09-27-14');
    });
  });

  describe('Validation Schema (Zod)', () => {
    test('validates valid schedule payload correctly', () => {
      const validPayload = {
        subject: 'ReachInbox Demo Outreach',
        body: '<p>Hello world</p>',
        recipients: ['lead1@gmail.com', 'lead2@gmail.com'],
        startTime: new Date().toISOString(),
        delayBetweenEmails: 2000,
        hourlyLimit: 50,
      };

      const result = ScheduleEmailSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    test('rejects payload with invalid email or empty recipients', () => {
      const invalidPayload = {
        subject: 'ReachInbox Demo Outreach',
        body: 'Hello',
        recipients: ['not-an-email'],
        startTime: new Date().toISOString(),
      };

      const result = ScheduleEmailSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('Per-campaign hourlyLimit rate limiting', () => {
    // Use a test-scoped key so this test never collides with live counters.
    const TEST_SENDER_ID = `test-sender-hourlylimit-${Date.now()}`;

    // Clean up the test Redis key before and after so tests are deterministic.
    beforeEach(async () => {
      const hourWindow = getHourWindow(new Date());
      const key = `email-rate:${TEST_SENDER_ID}:${hourWindow}`;
      await redisConnection.del(key);
    });

    afterAll(async () => {
      const hourWindow = getHourWindow(new Date());
      const key = `email-rate:${TEST_SENDER_ID}:${hourWindow}`;
      await redisConnection.del(key);
    });

    test('campaign with hourlyLimit=2 and 3 emails: first 2 allowed, 3rd blocked', async () => {
      const CAMPAIGN_LIMIT = 2;

      // Simulate 3 worker calls for the same sender using the per-campaign limit.
      const result1 = await acquireSendSlot(TEST_SENDER_ID, CAMPAIGN_LIMIT);
      const result2 = await acquireSendSlot(TEST_SENDER_ID, CAMPAIGN_LIMIT);
      const result3 = await acquireSendSlot(TEST_SENDER_ID, CAMPAIGN_LIMIT);

      // Email 1 → should be allowed (count=1, limit=2)
      expect(result1.allowed).toBe(true);
      expect(result1.currentCount).toBe(1);
      expect(result1.maxLimit).toBe(2);

      // Email 2 → should be allowed (count=2, limit=2)
      expect(result2.allowed).toBe(true);
      expect(result2.currentCount).toBe(2);
      expect(result2.maxLimit).toBe(2);

      // Email 3 → should be BLOCKED (count=3, limit=2)
      expect(result3.allowed).toBe(false);
      expect(result3.currentCount).toBe(3);
      expect(result3.maxLimit).toBe(2);
    });

    test('when no hourlyLimit supplied, falls back to global MAX_EMAILS_PER_HOUR', async () => {
      // acquireSendSlot default param = config.worker.maxEmailsPerHour (200 in test env)
      const result = await acquireSendSlot(TEST_SENDER_ID);
      // With default limit (200), a single call must always be allowed.
      expect(result.allowed).toBe(true);
      expect(result.maxLimit).toBeGreaterThanOrEqual(1);
    });
  });
});

