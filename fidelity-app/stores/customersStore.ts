import { create } from 'zustand';
import { Customer, StampHistory } from '../../shared/types';
import { customersApi } from '../lib/api';

interface CustomersState {
  customers: Customer[];
  selectedCustomer: Customer | null;
  customerHistory: StampHistory[];
  isLoading: boolean;
  error: string | null;

  loadCustomers: (restaurantId: string, params?: { search?: string; filter?: string }) => Promise<void>;
  loadCustomer: (id: string) => Promise<void>;
  createCustomer: (data: Partial<Customer> & { restaurant_id: string; gdpr_consent: boolean; marketing_consent: boolean }) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addStamp: (id: string, note?: string) => Promise<{ reward_claimed: boolean; message: string }>;
  addPoints: (id: string, points: number, note?: string) => Promise<void>;
  loadHistory: (id: string) => Promise<void>;
  clearSelected: () => void;
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  selectedCustomer: null,
  customerHistory: [],
  isLoading: false,
  error: null,

  loadCustomers: async (restaurantId, params) => {
    try {
      set({ isLoading: true, error: null });
      const res = await customersApi.list(restaurantId, params);
      set({ customers: res.data.data, isLoading: false });
    } catch (err) {
      set({ error: 'Impossible de charger les clients', isLoading: false });
    }
  },

  loadCustomer: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const res = await customersApi.get(id);
      set({ selectedCustomer: res.data.data, isLoading: false });
    } catch (err) {
      set({ error: 'Client non trouvé', isLoading: false });
    }
  },

  createCustomer: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const res = await customersApi.create(data as any);
      const newCustomer = res.data.data;
      set((state) => ({
        customers: [newCustomer, ...state.customers],
        isLoading: false,
      }));
      return newCustomer;
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erreur lors de la création du client';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  updateCustomer: async (id, data) => {
    try {
      set({ isLoading: true, error: null });
      const res = await customersApi.update(id, data);
      const updated = res.data.data;
      set((state) => ({
        customers: state.customers.map((c) => (c.id === id ? updated : c)),
        selectedCustomer: state.selectedCustomer?.id === id ? updated : state.selectedCustomer,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: 'Erreur lors de la mise à jour', isLoading: false });
      throw err;
    }
  },

  deleteCustomer: async (id) => {
    try {
      await customersApi.delete(id);
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== id),
        selectedCustomer: state.selectedCustomer?.id === id ? null : state.selectedCustomer,
      }));
    } catch (err) {
      set({ error: 'Erreur lors de la suppression' });
      throw err;
    }
  },

  addStamp: async (id, note) => {
    try {
      const res = await customersApi.addStamp(id, note);
      const updated = res.data.data;
      set((state) => ({
        customers: state.customers.map((c) => (c.id === id ? updated : c)),
        selectedCustomer: state.selectedCustomer?.id === id ? updated : state.selectedCustomer,
      }));
      return { reward_claimed: res.data.reward_claimed, message: res.data.message };
    } catch (err) {
      throw err;
    }
  },

  addPoints: async (id, points, note) => {
    try {
      const res = await customersApi.addPoints(id, points, note);
      const updated = res.data.data;
      set((state) => ({
        customers: state.customers.map((c) => (c.id === id ? updated : c)),
        selectedCustomer: state.selectedCustomer?.id === id ? updated : state.selectedCustomer,
      }));
    } catch (err) {
      throw err;
    }
  },

  loadHistory: async (id) => {
    try {
      const res = await customersApi.getHistory(id);
      set({ customerHistory: res.data.data });
    } catch (err) {
      set({ customerHistory: [] });
    }
  },

  clearSelected: () => set({ selectedCustomer: null, customerHistory: [] }),
}));
