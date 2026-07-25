import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import type { ApiError } from "@/features/auth/types";
import { ADMIN_BASE, API_URL } from "./config";

/**
 * Extract error message from API response.
 * NestJS returns: { statusCode, message: string | string[], error }
 * Axios wraps it in: AxiosError.response?.data
 *
 * This function extracts the ACTUAL API message, not the generic HTTP error.
 */
export function extractApiError(err: unknown): string {
  const axiosError = err as AxiosError<ApiError> | null;
  const apiMessage = axiosError?.response?.data?.message;

  if (typeof apiMessage === "string" && apiMessage.length > 0) {
    return apiMessage;
  }

  if (Array.isArray(apiMessage) && apiMessage.length > 0) {
    return apiMessage[0];
  }

  // Fallback — should rarely happen
  return "Terjadi kesalahan";
}

/** Extended request config with retry flag */
interface RequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

/**
 * Axios instance for admin panel.
 * - Development: baseURL "/api" → Vite proxy → Nest backend
 * - Production:  baseURL langsung ke API (VITE_API_URL)
 * Token is stored in localStorage and attached via interceptor.
 */
const api = axios.create({
  baseURL: API_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
});

/** Queue of pending requests while refreshing */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

/** Attach Bearer token to every request */
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("admin_token");
  if (stored) {
    config.headers.Authorization = `Bearer ${stored}`;
  }
  return config;
});

/** Auto-refresh on 401 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as RequestConfig;

    // Only retry on 401 for non-auth endpoints
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.startsWith("/auth/login") ||
      originalRequest.url?.startsWith("/auth/register") ||
      originalRequest.url?.startsWith("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request while another refresh is in flight
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers!.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem("admin_refresh");
      if (!refreshToken) throw new Error("No refresh token");

      const { data } = await api.post<{ accessToken: string }>(
        "/auth/refresh",
        { refreshToken },
      );

      localStorage.setItem("admin_token", data.accessToken);
      processQueue(null, data.accessToken);

      originalRequest.headers!.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_refresh");
      localStorage.removeItem("admin_user");
      // Redirect to the secret login path
      window.location.href = ADMIN_BASE;
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
