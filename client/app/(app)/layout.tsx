import type { ReactNode } from "react";
import { AppShell } from "@/components/dashboard/app-shell";

/**
 * Layout for authenticated pages (me, orders, checkout, admin).
 * Wraps content in AppShell which provides sidebar navigation + header.
 * The middleware.ts handles redirect to /auth/login if not authenticated.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
