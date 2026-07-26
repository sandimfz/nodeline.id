import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useMe } from "@/features/auth/hooks";
import api from "@/lib/api-client";

/**
 * AuthInit — bootstraps admin session on app mount.
 *
 * Since access tokens are stored in memory only (cleared on page refresh),
 * this component attempts a silent refresh via the httpOnly cookie on mount.
 * If the refresh succeeds, the access token is restored in memory and the
 * app resumes authenticated state. If it fails, the user stays logged out.
 */
export function AuthInit() {
  const setToken = useAuthStore((s) => s.setToken);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const token = useAuthStore((s) => s.token);
  const ran = useRef(false);

  // On mount: attempt silent refresh from httpOnly cookie
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // If we already have a token (e.g. just logged in), skip refresh
    if (token) {
      setHydrated();
      return;
    }

    // Try refreshing using the httpOnly cookie
    api
      .post<{ accessToken: string }>("/auth/refresh", {})
      .then(({ data }) => {
        setToken(data.accessToken);
      })
      .catch(() => {
        // No valid refresh cookie — user stays logged out
      })
      .finally(() => {
        setHydrated();
      });
  }, [token, setToken, setHydrated]);

  // Fetch /api/auth/me if token exists (verifies token and syncs user data)
  useMe();

  // This component doesn't render anything
  return null;
}
