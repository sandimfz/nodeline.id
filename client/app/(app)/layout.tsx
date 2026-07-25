import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/dashboard/app-shell";

/**
 * Layout for authenticated pages (dashboard, orders, api-keys).
 * Wraps content in AppShell which provides sidebar navigation + header.
 * The middleware.ts handles redirect to /auth/login if not authenticated.
 */

// Authenticated pages hold user-specific data and must never be indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
