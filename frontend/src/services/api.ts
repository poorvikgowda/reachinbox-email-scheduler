import axios from 'axios';
import { User, EmailItem, ScheduleEmailPayload, SlackStatus } from '../types';

const API_BASE_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Interceptor to add Authorization Bearer token from localStorage if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  getMe: async (): Promise<User> => {
    const response = await api.get('/api/auth/me');
    return response.data.data;
  },
  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout');
    localStorage.removeItem('token');
  },
};

export const emailService = {
  schedule: async (payload: ScheduleEmailPayload) => {
    const response = await api.post('/api/emails/schedule', payload);
    return response.data;
  },
  getScheduled: async (): Promise<EmailItem[]> => {
    const response = await api.get('/api/emails/scheduled');
    return response.data.data;
  },
  getSent: async (): Promise<EmailItem[]> => {
    const response = await api.get('/api/emails/sent');
    return response.data.data;
  },
  search: async (query: string): Promise<{ source: string; data: EmailItem[] }> => {
    const response = await api.get(`/api/emails/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
};

export const slackService = {
  getStatus: async (): Promise<SlackStatus> => {
    const response = await api.get('/api/slack/status');
    return response.data.data;
  },
  disconnect: async (): Promise<void> => {
    await api.post('/api/slack/disconnect');
  },
};

export default api;
