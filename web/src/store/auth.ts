import { create } from 'zustand';
import { api, setToken } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  loadSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',

  loadSession: async () => {
    set({ status: 'loading' });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, status: 'authenticated' });
    } catch {
      set({ user: null, status: 'unauthenticated' });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.token);
    set({ user: data.user, status: 'authenticated' });
  },

  register: async (email, password, name) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    setToken(data.token);
    set({ user: data.user, status: 'authenticated' });
  },

  logout: () => {
    setToken(null);
    set({ user: null, status: 'unauthenticated' });
  },
}));
