import { create } from 'zustand';
import { usersApi } from '../services/api';

interface CreditsState {
  credits: number | null;
  loading: boolean;
  error: string | null;
  fetchCredits: () => Promise<void>;
}

export const useCreditsStore = create<CreditsState>((set) => ({
  credits: null,
  loading: false,
  error: null,

  fetchCredits: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await usersApi.getMe();
      set({ credits: data.creditsRemaining, loading: false });
    } catch {
      set({ loading: false, error: 'Failed to load credits' });
    }
  },
}));
