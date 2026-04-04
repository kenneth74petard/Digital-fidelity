import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Restaurant
export const restaurantApi = {
  setup: (data: {
    name: string;
    description?: string;
    color_primary: string;
    color_secondary: string;
    logo_emoji: string;
    stamp_goal: number;
    points_per_visit: number;
  }) => api.post('/api/restaurant/setup', data),

  get: (id: string) => api.get(`/api/restaurant/${id}`),

  update: (id: string, data: Partial<{
    name: string;
    description: string;
    color_primary: string;
    color_secondary: string;
    logo_emoji: string;
    stamp_goal: number;
    points_per_visit: number;
  }>) => api.put(`/api/restaurant/${id}`, data),
};

// Customers
export const customersApi = {
  list: (restaurantId: string, params?: { search?: string; filter?: string }) =>
    api.get('/api/customers', { params: { restaurantId, ...params } }),

  get: (id: string) => api.get(`/api/customers/${id}`),

  create: (data: {
    restaurant_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    gdpr_consent: boolean;
    marketing_consent: boolean;
  }) => api.post('/api/customers', data),

  update: (id: string, data: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    marketing_consent: boolean;
  }>) => api.put(`/api/customers/${id}`, data),

  delete: (id: string) => api.delete(`/api/customers/${id}`),

  addStamp: (id: string, note?: string) =>
    api.post(`/api/customers/${id}/stamp`, { note }),

  addPoints: (id: string, points: number, note?: string) =>
    api.post(`/api/customers/${id}/points`, { points, note }),

  getHistory: (id: string) => api.get(`/api/customers/${id}/history`),
};

// Passes
export const passesApi = {
  getQr: (customerId: string) => api.get(`/api/passes/${customerId}/qr`),
  downloadUrl: (customerId: string) => `${BASE_URL}/api/passes/${customerId}/download`,
};

// Notifications
export const notificationsApi = {
  send: (data: {
    restaurant_id: string;
    title: string;
    body: string;
    type: string;
  }) => api.post('/api/notifications/send', data),

  schedule: (data: {
    restaurant_id: string;
    title: string;
    body: string;
    type: string;
    scheduled_at: string;
  }) => api.post('/api/notifications/schedule', data),

  list: (restaurantId: string) => api.get(`/api/notifications/${restaurantId}`),

  delete: (id: string) => api.delete(`/api/notifications/${id}`),
};

// Stats
export const statsApi = {
  get: (restaurantId: string) => api.get(`/api/stats/${restaurantId}`),
};

export default api;
