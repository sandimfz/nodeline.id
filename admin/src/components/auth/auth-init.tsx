import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useMe } from "@/features/auth/hooks";

/**
 * AuthInit — checks session on app mount.
 *
 * If a token exists in localStorage (loaded by zustatnd store),
 * the useMe hook will automatically fetch /api/auth/me to
 * verify the token and update the user data.
 *
 * This component ensures the user store is hydrated before
 * any downstream component tries to read it.
 */
export function AuthInit() {
  const _hydrated = useAuthStore((s) => s._hydrated);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const ran = useRef(false);

  // Mark hydrated on mount (token already loaded from localStorage by the store)
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!_hydrated) {
      setHydrated();
    }
  }, [_hydrated, setHydrated]);

  // Fetch /api/auth/me if token exists (verifies token is still valid)
  useMe();

  // This component doesn't render anything
  return null;
}
