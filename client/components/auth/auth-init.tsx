"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@/features/auth/types";

/**
 * AuthInit component.
 *
 * On mount, checks the TanStack Query cache for user data that was
 * prefetched server-side (by the root layout). If present, it hydrates
 * the zustand store directly from the cache — no network request needed.
 *
 * If the cache is empty (no session / prefetch failed), it falls back  * to fetching `/api/v1/bff/auth/me` via the BFF proxy to check for a session.
 *
 * This component renders nothing — it's a side-effect-only initializer.
 */
export function AuthInit() {
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  const calledRef = useRef(false);

  useEffect(() => {
    // Guard against double-call in Strict Mode
    if (calledRef.current) return;
    calledRef.current = true;

    async function init() {
      // 1. Check if server-side prefetch already cached the user
      const cachedUser = queryClient.getQueryData<User>(queryKeys.auth.me);

      if (cachedUser) {
        // Hydrate zustand store from cache — no fetch needed
        setSession("bff-session", cachedUser);
        setHydrated();
        return;
      }

      // 2. Fallback: fetch via BFF (for direct navigation to login page etc.)
      try {
        const res = await fetch("/api/v1/bff/auth/me", {
          credentials: "include",
        });

        if (res.ok) {
          const user: User = await res.json();
          // Seed the query cache so useMe() consumers get instant data
          queryClient.setQueryData(queryKeys.auth.me, user);
          setSession("bff-session", user);
        }
      } catch {
        // Network error or backend unavailable — guest state
      } finally {
        setHydrated();
      }
    }

    init();
  }, [queryClient, setSession, setHydrated]);

  return null;
}
