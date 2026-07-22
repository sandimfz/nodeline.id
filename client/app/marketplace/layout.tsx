import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import type { ReactNode } from "react";

/**
 * Layout for authenticated pages (me, orders, checkout, admin).
 * Wraps content in AppShell which provides sidebar navigation + header.
 * The middleware.ts handles redirect to /auth/login if not authenticated.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <><Header/>{children}<Footer/></>;
}
