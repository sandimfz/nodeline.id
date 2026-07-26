import { create } from "zustand";
import type { User } from "@/features/auth/types";

/**
 * Admin auth store — access token in MEMORY ONLY.
 *
 * Security: tokens are never written to localStorage to prevent XSS exfiltration.
 * - Access token: stored in Zustand (memory) — cleared on page refresh
 * - Refresh token: stored in httpOnly cookie by Nest backend — inaccessible to JS
 * - User info: stored in sessionStorage (non-sensitive, clears on tab close)
 *
 * On page refresh, the app will auto-refresh the session via the httpOnly cookie.
 */

const USER_KEY = "admin_user";

interface AuthState {
  /** Access token stored in memory only (never localStorage) */
  token: string | null;
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

function loadUserFromStorage(): User | null {
  try {
    const userRaw = sessionStorage.getItem(USER_KEY);
    return userRaw ? (JSON.parse(userRaw) as User) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null, // Always starts null — refreshed from httpOnly cookie on mount
  refreshToken: null, // DEPRECATED — no longer stored client-side
  user: loadUserFromStorage(),
  _hydrated: false,

  setSession: (token, _refreshToken, user) => {
    // Token: memory only. Refresh token: handled by httpOnly cookie (not stored here).
    // User info: sessionStorage (non-sensitive, clears on tab close)
    try {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* quota exceeded — non-critical */ }
    set({ token, user, _hydrated: true });
  },

  setToken: (token) => {
    set({ token });
  },

  setUser: (user) => {
    try {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* non-critical */ }
    set({ user });
  },

  clearSession: () => {
    try {
      sessionStorage.removeItem(USER_KEY);
    } catch { /* non-critical */ }
    set({ token: null, user: null });
  },

  setHydrated: () => set({ _hydrated: true }),
}));
