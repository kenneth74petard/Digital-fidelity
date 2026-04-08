import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sur le web, utiliser des URLs relatives (le frontend et l'API sont servis depuis le même serveur)
// Sur mobile natif, utiliser la variable d'environnement
function getBaseUrl(): string {
  // On web, always use relative URLs — Vercel rewrites proxy /api/* to the backend
  if (typeof window !== 'undefined' && window.location) {
    return '';
  }

  const envUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  if (envUrl) {
    return envUrl;
  }

  return 'http://localhost:3000';
}

const BASE_URL = getBaseUrl();
const API_TOKEN = process.env.EXPO_PUBLIC_ADMIN_TOKEN || '';
const RESTAURANT_ID_KEY = '@fidelity:restaurantId';

function extractRestaurantIdFromConfig(config: any): string {
  const fromParams = String(config?.params?.restaurantId || config?.params?.restaurant_id || '').trim();
  const fromData = String(config?.data?.restaurant_id || config?.data?.restaurantId || '').trim();
  return fromParams || fromData;
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  if (API_TOKEN) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${API_TOKEN}`;
  }

  const scopedRestaurantId = extractRestaurantIdFromConfig(config) || String(await AsyncStorage.getItem(RESTAURANT_ID_KEY) || '').trim();
  if (scopedRestaurantId) {
    config.headers = config.headers || {};
    config.headers['x-restaurant-id'] = scopedRestaurantId;
  }

  return config;
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

  get: (id: string, restaurantId: string) => api.get(`/api/customers/${id}`, { params: { restaurantId } }),

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
  }>, restaurantId: string) => api.put(`/api/customers/${id}`, data, { params: { restaurantId } }),

  delete: (id: string, restaurantId: string) => api.delete(`/api/customers/${id}`, { params: { restaurantId } }),

  addStamp: (id: string, restaurantId: string, note?: string) =>
    api.post(`/api/customers/${id}/stamp`, { note, restaurant_id: restaurantId }),

  addPoints: (id: string, restaurantId: string, points: number, note?: string) =>
    api.post(`/api/customers/${id}/points`, { points, note, restaurant_id: restaurantId }),

  getHistory: (id: string, restaurantId: string) => api.get(`/api/customers/${id}/history`, { params: { restaurantId } }),

  importCsv: (restaurant_id: string, rows: { first_name: string; last_name: string; email: string; phone?: string }[]) =>
    api.post('/api/customers/import', { restaurant_id, rows }),
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

  delete: (id: string, restaurantId: string) => api.delete(`/api/notifications/${id}`, { params: { restaurantId } }),
};

// Stats
export const statsApi = {
  get: (restaurantId: string) => api.get(`/api/stats/${restaurantId}`, { params: { restaurantId } }),
};

export default api;
