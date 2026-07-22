import { create } from "zustand";
import type { User } from "@/features/auth/types";

/** Key used to persist token & refresh token in localStorage */
const TOKEN_KEY = "admin_token";
const REFRESH_KEY = "admin_refresh";
const USER_KEY = "admin_user";

interface AuthState {
  /** Access token persisted in localStorage */
  token: string | null;
  /** Refresh token persisted in localStorage */
  refreshToken: string | null;
  /** Current authenticated user */
  user: User | null;
  /** Whether we've checked the session on mount */
  _hydrated: boolean;

  setSession: (token: string, refreshToken: string | undefined, user: User) => void;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
  setHydrated: () => void;
}

function loadFromStorage() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    const user = userRaw ? (JSON.parse(userRaw) as User) : null;
    return { token, refreshToken, user, _hydrated: !!token };
  } catch {
    return { token: null, refreshToken: null, user: null, _hydrated: false };
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadFromStorage(),

  setSession: (token, refreshToken, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, refreshToken: refreshToken ?? null, user, _hydrated: true });
  },

  setToken: (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ token });
  },

  setUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, refreshToken: null, user: null, _hydrated: false });
  },

  setHydrated: () => set({ _hydrated: true }),
}));
