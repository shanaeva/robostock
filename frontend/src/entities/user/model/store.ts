import { create } from 'zustand';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

interface UserStore {
  user: CurrentUser | null;
  setUser: (user: CurrentUser) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
