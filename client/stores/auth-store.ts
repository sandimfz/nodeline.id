import { create } from "zustand";
import type { User } from "@/features/auth/types";

interface AuthState {
  /** Access token stored in memory only (not localStorage — follows backend security recommendation) */
  accessToken: string | null;
  /** Current authenticated user, null when not logged in */
  user: User | null;
  /** Whether we've checked the session (on mount) */
  _hydrated: boolean;

  /** Set session after login/register */
  setSession: (accessToken: string, user: User) => void;
  /** Update just the access token (on refresh) */
  setAccessToken: (token: string) => void;
  /** Update just the user (e.g. after me fetch) */
  setUser: (user: User) => void;
  /** Clear everything on logout */
  clearSession: () => void;
  /** Mark hydration complete */
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  _hydrated: false,

  setSession: (accessToken, user) => set({ accessToken, user, _hydrated: true }),

  setAccessToken: (accessToken) => set({ accessToken }),

  setUser: (user) => set({ user }),

  clearSession: () => set({ accessToken: null, user: null }),

  setHydrated: () => set({ _hydrated: true }),
}));
