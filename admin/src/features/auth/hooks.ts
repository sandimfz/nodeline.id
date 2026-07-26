import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import { ADMIN_BASE } from "@/lib/config";
import { loginUser, logoutUser, getMe, fetchUsers, updateProfile } from "./api";
import type { LoginInput } from "./types";

/**
 * Login mutation for admin.
 * On success: persists token in memory (Zustand), redirects.
 * Refresh token is stored as httpOnly cookie by Nest backend automatically.
 */
export function useLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (data: LoginInput) => loginUser(data),
    onSuccess: (res) => {
      // Only allow god role to access admin panel
      if (res.user.role !== "god") {
        throw new Error("Akses ditolak: hanya admin yang dapat masuk");
      }
      setSession(res.accessToken, res.refreshToken, res.user);
      queryClient.setQueryData(queryKeys.auth.me, res.user);
      navigate(`${ADMIN_BASE}/dashboard`);
    },
  });
}

/**
 * Logout mutation for admin.
 */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);

  return useMutation({
    mutationFn: () => logoutUser(),
    onSettled: () => {
      clearSession();
      queryClient.clear();
      navigate(ADMIN_BASE);
    },
  });
}

/**
 * Update admin profile (name only).
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (data: { name: string }) => updateProfile(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(queryKeys.auth.me, updatedUser);
    },
  });
}

/**
 * List all users (god only).
 */
export function useUsers() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.auth.users,
    queryFn: fetchUsers,
    enabled: !!token,
    staleTime: 30_000,
  });
}

/**
 * Get current admin user info.
 * Token is read from Zustand (memory-only).
 */
export function useMe() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const user = await getMe();
      setUser(user);
      return user;
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
