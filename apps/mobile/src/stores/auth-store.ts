import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface AuthState {
  token: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, userId: string) => void;
  logout: () => void;
  loadToken: () => Promise<void>;
}

const TOKEN_KEY = 'listic_auth_token';
const USERID_KEY = 'listic_user_id';

// SecureStore is not available on web
const storage = {
  get: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  set: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  delete: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (token: string, userId: string) => {
    await storage.set(TOKEN_KEY, token);
    await storage.set(USERID_KEY, userId);
    set({ token, userId, isAuthenticated: true });
  },

  logout: async () => {
    await storage.delete(TOKEN_KEY);
    await storage.delete(USERID_KEY);
    set({ token: null, userId: null, isAuthenticated: false });
  },

  loadToken: async () => {
    const token = await storage.get(TOKEN_KEY);
    const userId = await storage.get(USERID_KEY);
    set({
      token,
      userId,
      isAuthenticated: !!token,
      isLoading: false,
    });
  },
}));
