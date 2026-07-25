/**
 * Shared configuration for admin panel.
 * Reads environment variables from Vite's import.meta.env.
 */

/** Secret path for admin login — di-env biar gampang diganti */
export const ADMIN_LOGIN_PATH =
  import.meta.env.VITE_ADMIN_LOGIN_PATH ?? "iasniaguiagsiashas";

/** Base path for all admin routes — login path + optional prefix */
export const ADMIN_BASE = `/${ADMIN_LOGIN_PATH}`;

/**
 * Full API base URL untuk production.
 * Di development (Vite proxy): undefined → fallback ke "/api"
 * Di production: set VITE_API_URL=https://api.sandimf.dev/api/v1
 */
export const API_URL: string | undefined =
  import.meta.env.VITE_API_URL || undefined;
