import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import { loginUser, registerUser, logoutUser, getMe, updateProfile, uploadAvatar, deleteAvatar } from "./api";
import type { LoginInput, RegisterInput } from "./types";
import type { UpdateProfileInput } from "./schema";

/**
 * Login mutation.
 * On success: stores accessToken + user in zustand, caches user in query, redirects.
 * Error handling is delegated to the call-site (SignInForm) to avoid double toast.
 */
export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (data: LoginInput) => loginUser(data),
    onSuccess: (res) => {
      setSession(res.accessToken, res.user);
      queryClient.setQueryData(queryKeys.auth.me, res.user);
      router.push("/dashboard");
    },
  });
}

/**
 * Register mutation.
 * On success: stores accessToken + user in zustand, caches user in query, redirects.
 * Error handling is delegated to the call-site (RegisterForm) to avoid double toast.
 */
export function useRegister() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (data: RegisterInput) => registerUser(data),
    onSuccess: (res) => {
      setSession(res.accessToken, res.user);
      queryClient.setQueryData(queryKeys.auth.me, res.user);
      router.push("/dashboard");
    },
  });
}

/**
 * Logout mutation.
 * On success/error: clears auth store, clears query cache, redirects to login.
 */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);

  return useMutation({
    mutationFn: () => logoutUser(),
    onSettled: () => {
      clearSession();
      queryClient.clear();
      router.push("/auth/login");
    },
  });
}

/**
 * Update profile mutation.
 * Only updates the `name` field. Other fields are rejected by the API layer.
 * On success: updates the zustand store and query cache with the new user data.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (data: UpdateProfileInput) => updateProfile(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(queryKeys.auth.me, updatedUser);
    },
  });
}

/**
 * Upload avatar mutation.
 * Uploads to storage endpoint, server auto-attaches to user.
 * On success: re-fetches user data.
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

/**
 * Delete avatar mutation.
 * On success: re-fetches user data.
 */
export function useDeleteAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAvatar(),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(queryKeys.auth.me, updatedUser);
    },
  });
}

/**
 * Get current user info.
 *
 * Reads from TanStack Query cache. Jika cache belum ada (belum login),
 * queryFn akan fetch via BFF dan return null jika gagal (401).
 *
 * SSR prefetch dilakukan oleh root layout dan halaman profile, sehingga
 * data user langsung tersedia di cache tanpa loading flash.
 *
 * Hasil fetch juga di-sync ke zustand store untuk komponen legacy.
 */
export function useMe() {
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      try {
        const user = await getMe();
        setUser(user);
        return user;
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
