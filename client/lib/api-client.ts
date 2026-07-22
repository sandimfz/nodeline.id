/**
 * API client that calls through the BFF proxy at `/api/v1/bff/{path}`.
 *
 * Features:
 * - Automatically forwards cookies (credentials: 'include')
 * - On 401 from non-auth endpoints: attempts a single silent refresh,
 *   then retries the original request once.
 * - Deduplicates concurrent refresh calls via a promise mutex so N
 *   parallel 401s only trigger a single refresh.
 */

type RequestConfig = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

let refreshPromise: Promise<boolean> | null = null;

/**
 * Call the BFF proxy at `/api/v1/bff/{path}`.
 * The BFF handles cookie/session management server-side.
 */
async function bffFetch<T>(
  path: string,
  config: RequestConfig = {},
): Promise<T> {
  const url = `/api/v1/bff${path.startsWith("/") ? path : `/${path}`}`;

  // Skip Content-Type for FormData (multipart uploads) — let browser set it with boundary
  const body = (config as { body?: BodyInit }).body;
  const isFormData = body instanceof FormData;

  const res = await fetch(url, {
    ...config,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...config.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({
      statusCode: res.status,
      message: res.statusText,
    }));
    throw body;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

/**
 * Fetch with automatic silent refresh on 401.
 * Only retries once. If refresh fails, the error propagates to the caller.
 */
async function apiClient<T>(
  path: string,
  config: RequestConfig = {},
): Promise<T> {
  try {
    return await bffFetch<T>(path, config);
  } catch (err: unknown) {
    const error = err as { statusCode?: number };
    // Only retry on 401 for non-auth endpoints (avoid infinite loop)
    if (
      error?.statusCode !== 401 ||
      path.startsWith("/auth/login") ||
      path.startsWith("/auth/register") ||
      path.startsWith("/auth/refresh")
    ) {
      throw err;
    }

    // Attempt refresh once with mutex deduplication
    const refreshed = await refreshMutex();

    if (!refreshed) {
      // Refresh failed — propagate the original 401
      throw err;
    }

    // Retry original request
    return bffFetch<T>(path, config);
  }
}

/**
 * Mutex: only one refresh call at a time.
 * Returns true if refresh succeeded, false otherwise.
 */
async function refreshMutex(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = performRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function performRefresh(): Promise<boolean> {
  try {
    const res = await bffFetch<{ accessToken: string }>("/auth/refresh", {
      method: "POST",
    });
    // Store the new access token in the zustand store
    // We dynamically import to avoid circular deps at module level
    const { useAuthStore } = await import("@/stores/auth-store");
    useAuthStore.getState().setAccessToken(res.accessToken);
    return true;
  } catch {
    // Refresh failed (e.g. reuse detection or token expired) — clear session
    const { useAuthStore } = await import("@/stores/auth-store");
    useAuthStore.getState().clearSession();
    return false;
  }
}

export { bffFetch, apiClient };
export type { RequestConfig };
