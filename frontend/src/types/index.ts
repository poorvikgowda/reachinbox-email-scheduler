export interface User {
  id: string;
  googleId: string;
  name: string;
  email: string;
  avatar?: string | null;
  slackAccessToken?: string | null;
  slackTeamId?: string | null;
  slackConnected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Sender {
  id: string;
  userId: string;
  name: string;
  email: string;
  etherealUser?: string | null;
  createdAt: string;
}

export interface EmailItem {
  id: string;
  userId: string;
  senderId?: string | null;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: 'scheduled' | 'processing' | 'sent' | 'failed';
  attempts: number;
  bullJobId?: string | null;
  messageId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: Sender;
}

export interface ScheduleEmailPayload {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails?: number;
  hourlyLimit?: number;
  senderId?: string;
}

export interface SlackStatus {
  slackConnected: boolean;
  slackTeamId?: string | null;
}
