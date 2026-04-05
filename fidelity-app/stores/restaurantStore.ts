import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant } from '../../shared/types';
import { restaurantApi } from '../lib/api';

const RESTAURANT_ID_KEY = '@fidelity:restaurantId';
const ONBOARDED_KEY = '@fidelity:onboarded';

interface RestaurantState {
  restaurant: Restaurant | null;
  isOnboarded: boolean;
  isLoading: boolean;
  error: string | null;

  checkOnboarding: () => Promise<void>;
  loadRestaurant: (id: string) => Promise<void>;
  setupRestaurant: (data: Partial<Restaurant>) => Promise<void>;
  updateRestaurant: (data: Partial<Restaurant>) => Promise<void>;
  setOnboarded: (restaurantId: string) => Promise<void>;
  reset: () => Promise<void>;
}

export const useRestaurantStore = create<RestaurantState>((set, get) => ({
  restaurant: null,
  isOnboarded: false,
  isLoading: true,
  error: null,

  checkOnboarding: async () => {
    try {
      const [onboarded, restaurantId] = await Promise.all([
        AsyncStorage.getItem(ONBOARDED_KEY),
        AsyncStorage.getItem(RESTAURANT_ID_KEY),
      ]);

      if (onboarded === 'true' && restaurantId) {
        set({ isOnboarded: true });
        await get().loadRestaurant(restaurantId);
        // If restaurant failed to load, fall back to onboarding
        if (!get().restaurant) {
          set({ isOnboarded: false, isLoading: false });
        }
      } else {
        set({ isOnboarded: false, isLoading: false });
      }
    } catch (err) {
      set({ isOnboarded: false, isLoading: false });
    }
  },

  loadRestaurant: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const res = await restaurantApi.get(id);
      set({ restaurant: res.data.data, isLoading: false });
    } catch (err) {
      // Restaurant unreachable: reset loading so app doesn't block
      set({ error: 'Impossible de charger le restaurant', isLoading: false, restaurant: null });
    }
  },

  setupRestaurant: async (data: Partial<Restaurant>) => {
    try {
      set({ isLoading: true, error: null });
      const res = await restaurantApi.setup(data as any);
      const restaurant = res.data.data;
      set({ restaurant, isLoading: false });
    } catch (err) {
      set({ error: 'Erreur lors de la création', isLoading: false });
      throw err;
    }
  },

  updateRestaurant: async (data: Partial<Restaurant>) => {
    const { restaurant } = get();
    if (!restaurant) return;
    try {
      set({ isLoading: true, error: null });
      const res = await restaurantApi.update(restaurant.id, data);
      set({ restaurant: res.data.data, isLoading: false });
    } catch (err) {
      set({ error: 'Erreur lors de la mise à jour', isLoading: false });
      throw err;
    }
  },

  setOnboarded: async (restaurantId: string) => {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    await AsyncStorage.setItem(RESTAURANT_ID_KEY, restaurantId);
    set({ isOnboarded: true });
  },

  reset: async () => {
    await AsyncStorage.removeItem(ONBOARDED_KEY);
    await AsyncStorage.removeItem(RESTAURANT_ID_KEY);
    set({ restaurant: null, isOnboarded: false });
  },
}));
