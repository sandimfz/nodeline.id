/**
 * Shared configuration for admin panel.
 * Reads environment variables from Vite's import.meta.env.
 */

/** Secret path for admin login — di-env biar gampang diganti */
export const ADMIN_LOGIN_PATH =
  import.meta.env.VITE_ADMIN_LOGIN_PATH ?? "iasniaguiagsiashas";

/** Base path for all admin routes — login path + optional prefix */
export const ADMIN_BASE = `/${ADMIN_LOGIN_PATH}`;
