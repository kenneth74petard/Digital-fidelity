import { create } from 'zustand';
import { Notification } from '../../shared/types';
import { notificationsApi } from '../lib/api';

interface NotificationsState {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;

  loadNotifications: (restaurantId: string) => Promise<void>;
  sendNotification: (data: {
    restaurant_id: string;
    title: string;
    body: string;
    type: string;
  }) => Promise<{ sent_count: number; simulation: boolean }>;
  scheduleNotification: (data: {
    restaurant_id: string;
    title: string;
    body: string;
    type: string;
    scheduled_at: string;
  }) => Promise<void>;
  cancelNotification: (id: string) => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  isLoading: false,
  error: null,

  loadNotifications: async (restaurantId) => {
    try {
      set({ isLoading: true, error: null });
      const res = await notificationsApi.list(restaurantId);
      set({ notifications: res.data.data, isLoading: false });
    } catch (err) {
      set({ error: 'Impossible de charger les notifications', isLoading: false });
    }
  },

  sendNotification: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const res = await notificationsApi.send(data);
      // Reload notifications to include the newly sent one
      await get().loadNotifications(data.restaurant_id);
      set({ isLoading: false });
      return { sent_count: res.data.data.sent_count, simulation: res.data.simulation };
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erreur lors de l\'envoi';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  scheduleNotification: async (data) => {
    try {
      set({ isLoading: true, error: null });
      await notificationsApi.schedule(data);
      await get().loadNotifications(data.restaurant_id);
      set({ isLoading: false });
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erreur lors de la planification';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  cancelNotification: async (id) => {
    try {
      await notificationsApi.delete(id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    } catch (err) {
      throw err;
    }
  },
}));
