import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { ADMIN_BASE } from "@/lib/config";

/**
 * ProtectedRoute — checks if admin is authenticated.
 * If no token in memory (after silent refresh attempt), redirects to login.
 * Otherwise renders the child routes (including AppShell).
 */
export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const _hydrated = useAuthStore((s) => s._hydrated);

  // Wait for hydration before deciding
  if (!_hydrated) {
    return null;
  }

  if (!token) {
    return <Navigate to={ADMIN_BASE} replace />;
  }

  return <Outlet />;
}

/**
 * PublicRoute — redirects authenticated users away from login page.
 */
export function PublicRoute() {
  const token = useAuthStore((s) => s.token);
  const _hydrated = useAuthStore((s) => s._hydrated);

  if (!_hydrated) {
    return null;
  }

  if (token) {
    return <Navigate to={`${ADMIN_BASE}/dashboard`} replace />;
  }

  return <Outlet />;
}
