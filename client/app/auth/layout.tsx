import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Layout for auth routes (login, register, OAuth callbacks).
 *
 * These pages are excluded from search results: they hold no content worth
 * indexing, and the OAuth callbacks carry one-time codes in the URL.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AuthRoutesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
