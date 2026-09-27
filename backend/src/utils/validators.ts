import { z } from 'zod';

export const ScheduleEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  recipients: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient is required'),
  startTime: z.string().datetime({ message: 'Invalid start time ISO format' }).or(z.date()),
  delayBetweenEmails: z.number().nonnegative('Delay between emails must be zero or positive').optional(),
  hourlyLimit: z.number().positive('Hourly limit must be a positive integer').optional(),
  senderId: z.string().optional(),
});

export type ScheduleEmailInput = z.infer<typeof ScheduleEmailSchema>;
