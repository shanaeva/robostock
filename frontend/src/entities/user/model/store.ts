import { create } from 'zustand';

export type UserRole = 'ADMIN' | 'USER';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
