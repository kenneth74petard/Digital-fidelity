import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Résolution de l'URL du backend :
// 1. Variable d'env EXPO_PUBLIC_API_URL (Vercel dashboard, .env, mobile)
// 2. Sur web sans env → URLs relatives (quand frontend + backend sur même serveur)
// 3. Fallback localhost pour le dev local
function getBaseUrl(): string {
  const envUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  const onWeb = typeof window !== 'undefined' && !!window.location;

  if (envUrl) {
    // Page HTTPS + API en http:// = mixed content bloqué par le navigateur.
    // On ignore l'env et on passe par le proxy Vercel (URLs relatives).
    if (onWeb && window.location.protocol === 'https:' && envUrl.startsWith('http://')) {
      return '';
    }
    return envUrl;
  }

  // On web, use relative URLs — Vercel rewrites proxy /api/* to the backend
  if (onWeb) {
    return '';
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
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  if (API_TOKEN) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${API_TOKEN}`;
  }

  // Pas de scope sur /restaurant/setup : le backend refuse (403) la création
  // si un x-restaurant-id est présent — un vieux restaurantId en localStorage
  // bloquait sinon définitivement le re-onboarding.
  const isSetupRoute = String(config.url || '').includes('/restaurant/setup');
  const scopedRestaurantId = extractRestaurantIdFromConfig(config) || String(await AsyncStorage.getItem(RESTAURANT_ID_KEY) || '').trim();
  if (scopedRestaurantId && !isSetupRoute) {
    config.headers = config.headers || {};
    config.headers['x-restaurant-id'] = scopedRestaurantId;
  }

  return config;
});

// Intercepteur global : log les erreurs réseau clairement
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      console.warn('[API] Backend inaccessible. Vérifiez EXPO_PUBLIC_API_URL ou que le serveur tourne.');
    }
    return Promise.reject(err);
  }
);

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
