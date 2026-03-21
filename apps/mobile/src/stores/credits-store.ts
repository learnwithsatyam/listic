import { create } from 'zustand';
import { usersApi } from '../services/api';

interface CreditsState {
  credits: number | null;
  loading: boolean;
  fetchCredits: () => Promise<void>;
}

export const useCreditsStore = create<CreditsState>((set) => ({
  credits: null,
  loading: false,

  fetchCredits: async () => {
    set({ loading: true });
    try {
      const { data } = await usersApi.getMe();
      set({ credits: data.creditsRemaining, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
