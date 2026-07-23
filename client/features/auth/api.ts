import { bffFetch } from "@/lib/api-client";
import type {
  AuthResponse,
  RefreshResponse,
  LoginInput,
  RegisterInput,
  User,
} from "./types";
import { updateProfileSchema } from "./schema";

/**
 * Allowed fields for profile update — everything else is rejected.
 * Security first: prevents parameter pollution / mass assignment.
 */
const ALLOWED_UPDATE_FIELDS = new Set(["name"]);

/**
 * Register a new user.
 * POST /api/v1/bff/auth/register → BFF proxies to POST /api/v1/auth/register
 */
export async function registerUser(data: RegisterInput): Promise<AuthResponse> {
  return bffFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Login with email + password.
 * POST /api/v1/bff/auth/login → BFF proxies to POST /api/v1/auth/login
 */
export async function loginUser(data: LoginInput): Promise<AuthResponse> {
  return bffFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Refresh the access token using the httpOnly refresh cookie.
 * POST /api/v1/bff/auth/refresh → BFF proxies to POST /api/v1/auth/refresh
 */
export async function refreshToken(): Promise<RefreshResponse> {
  return bffFetch<RefreshResponse>("/auth/refresh", {
    method: "POST",
  });
}

/**
 * Logout: revoke the current refresh token.
 * POST /api/v1/bff/auth/logout → BFF proxies to POST /api/v1/auth/logout
 * The BFF will attach the Authorization header from its session cookie.
 */
export async function logoutUser(): Promise<{ message: string }> {
  return bffFetch<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}

/**
 * Update current user's profile.
 * PATCH /api/v1/bff/auth/me → BFF proxies to PATCH /api/v1/auth/me
 *
 * Security:
 * - Only `name` field is allowed; any other field triggers an error.
 * - Disallowed fields are checked on the RAW input BEFORE Zod parsing
 *   (Zod strips unknown fields by default, so the check must happen first).
 * - This prevents mass-assignment / parameter pollution.
 */
export async function updateProfile(data: Record<string, unknown>): Promise<User> {
  // 1. Check raw input for disallowed fields BEFORE Zod strips them
  const extraKeys = Object.keys(data).filter(
    (key) => !ALLOWED_UPDATE_FIELDS.has(key),
  );
  // Return specific error for each disallowed field (user requested this)
  if (extraKeys.length > 0) {
    const key = extraKeys[0];
    throw {
      statusCode: 400,
      message: `Parameter '${key}' tidak diizinkan`,
      error: "Bad Request",
    };
  }

  // 2. Validate allowed fields with Zod
  const parsed = updateProfileSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    throw {
      statusCode: 400,
      message: firstError?.message ?? "Validasi gagal",
      error: "Bad Request",
    };
  }

  return bffFetch<User>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(parsed.data),
  });
}

/**
 * Get current user info.
 * GET /api/v1/bff/auth/me → BFF proxies to GET /api/v1/auth/me
 * The BFF will attach the Authorization header from its session cookie.
 */
export async function getMe(): Promise<User> {
  return bffFetch<User>("/auth/me");
}

/**
 * Upload avatar via storage endpoint.
 * POST /api/v1/bff/storage/upload with purpose=avatar
 * The server auto-attaches the URL to the user.
 */
export async function uploadAvatar(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "avatar");

  const res = await fetch("/api/v1/bff/storage/upload", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Gagal upload avatar" }));
    throw err;
  }

  return res.json();
}

/**
 * Delete avatar.
 * DELETE /api/v1/bff/auth/me/avatar → BFF proxies to DELETE /api/v1/auth/me/avatar
 */
export async function deleteAvatar(): Promise<User> {
  return bffFetch<User>("/auth/me/avatar", {
    method: "DELETE",
  });
}
