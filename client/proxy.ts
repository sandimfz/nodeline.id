import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy for route protection (formerly middleware).
 *
 * Auth pages (/auth/*): redirect to / if session cookie exists
 * Protected pages (/dashboard, /me, /orders, etc.): redirect to /auth/login if no session
 *
 * Uses the nl_session cookie (set by BFF) as an indicator — does NOT validate the JWT itself.
 * Actual JWT validation happens server-side when the BFF proxies the request to Nest.
 */
const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "nl_session";

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/dashboard",
  "/dashboard/profile",
  "/dashboard/chat",
  "/orders",
  "/checkout",
  "/admin",
  "/chat",
];

// Routes for unauthenticated users only
const AUTH_ROUTES = ["/auth/login", "/auth/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  // Redirect authenticated users away from auth pages
  if (hasSession && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users trying to access protected routes
  if (
    !hasSession &&
    PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  ) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all auth and protected routes
    "/auth/:path*",
    "/dashboard/:path*",
    "/dashboard/profile",
    "/dashboard/chat",
    "/orders/:path*",
    "/checkout/:path*",
    "/admin/:path*",
    "/chat",
  ],
};
