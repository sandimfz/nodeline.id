import api from "@/lib/api-client";
import type { AuthResponse, LoginInput, User } from "./types";

/**
 * List all users (god only).
 * GET /api/auth/admin/users → Vite proxy → Nest
 */
export async function fetchUsers(): Promise<User[]> {
  const res = await api.get<User[]>("/auth/admin/users");
  return res.data;
}


/**
 * Login admin.
 * POST /api/auth/admin/login → server rejects non-god role
 */
export async function loginUser(data: LoginInput): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/admin/login", data);
  return res.data;
}

/**
 * Refresh access token.
 * POST /api/auth/refresh → Vite proxy → Nest
 */
export async function refreshToken(
  refreshToken: string,
): Promise<{ accessToken: string }> {
  const res = await api.post<{ accessToken: string }>("/auth/refresh", {
    refreshToken,
  });
  return res.data;
}

/**
 * Logout: revoke refresh token.
 * POST /api/auth/logout → Vite proxy → Nest
 */
export async function logoutUser(): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>("/auth/logout");
  return res.data;
}

/**
 * Get current admin user info.
 * GET /api/auth/me → Vite proxy → Nest
 */
export async function getMe(): Promise<User> {
  const res = await api.get<User>("/auth/me");
  return res.data;
}

/**
 * Update admin profile (name only).
 * PATCH /api/auth/me → Vite proxy → Nest
 */
export async function updateProfile(data: {
  name: string;
}): Promise<User> {
  const res = await api.patch<User>("/auth/me", data);
  return res.data;
}
