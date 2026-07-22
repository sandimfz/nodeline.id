import type { ReactNode } from "react";

/**
 * Layout for auth pages (login, register).
 * Redirects authenticated users away from these pages.
 * The actual redirect logic runs client-side via middleware.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
