import { NextRequest, NextResponse } from "next/server";

/**
 * BFF (Backend-for-Frontend) Route Handler.
 *
 * Proxies all requests from /api/v1/bff/{path} to the NestJS backend at
 * API_BASE_URL/{path}. Manages:
 *  - nl_session cookie (httpOnly): stores the access token for server-side use
 *  - nl_refresh cookie (httpOnly): stores the refresh token, forwarded from Nest
 *
 * This keeps both tokens away from client-side JavaScript, mitigating XSS theft.
 */

// Use localhost:3000 in dev; override via env in production
const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000/api/v1";
const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "nl_session";
const REFRESH_COOKIE = "nl_refresh";

// Paths that return auth tokens in the response
const AUTH_PATHS = new Set(["/auth/login", "/auth/register", "/auth/refresh", "/auth/oauth/google", "/auth/oauth/google/callback", "/auth/oauth/github", "/auth/oauth/github/callback"]);

/**
 * Public GET endpoints safe to cache at the edge, with their TTL in seconds.
 * These return the same data for every visitor, so caching removes the
 * Worker → VPS → DB round-trip (~700ms) for all but the first request.
 * Matched by prefix so `/products/<id>` inherits `/products`.
 */
const CACHEABLE_PREFIXES: Array<{ prefix: string; ttl: number }> = [
  { prefix: "/api-services", ttl: 60 },
  { prefix: "/products", ttl: 60 },
  { prefix: "/categories", ttl: 300 },
  { prefix: "/payment-methods", ttl: 300 },
];

function getCacheTtl(path: string): number | null {
  const match = CACHEABLE_PREFIXES.find((c) => path.startsWith(c.prefix));
  return match ? match.ttl : null;
}

async function handler(request: NextMethodRequest) {
  const path = getPath(request);
  const queryString = new URL(request.url).search; // preserve ?code=xxx etc.
  const url = `${API_BASE}${path}${queryString}`;
  const method = request.method;

  // Serve public GET endpoints from the edge cache when possible.
  // Only for anonymous requests — a session cookie means the response may
  // be user-specific, so we never serve or store those from a shared cache.
  const cacheTtl = method === "GET" ? getCacheTtl(path) : null;
  const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value;
  const useCache = cacheTtl !== null && !hasSession;

  if (useCache) {
    const cached = await readEdgeCache(url);
    if (cached) return cached;
  }

  // Build fetch headers for the NestJS backend
  const headers = new Headers();
  // Forward Content-Type from the client request
  const ct = request.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  // Forward the refresh cookie if present (for /auth/refresh)
  const refreshCookie = request.cookies.get(REFRESH_COOKIE);
  if (refreshCookie?.value) {
    headers.set("cookie", `${REFRESH_COOKIE}=${refreshCookie.value}`);
  }

  // For protected endpoints, attach the access token from the session cookie
  if (!AUTH_PATHS.has(path)) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE);
    if (sessionCookie?.value) {
      headers.set("authorization", `Bearer ${sessionCookie.value}`);
    }
  }

  // Read body for POST/PUT/PATCH/DELETE requests only
  // Gunakan blob() agar binary data (multipart upload) tidak corrupt
  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD") {
    body = await request.blob();
  }

  // Build the fetch request to Nest
  const fetchInit: RequestInit = {
    method,
    headers,
    ...(body ? { body } : {}),
  };

  let nestResponse: Response;
  try {
    nestResponse = await fetch(url, fetchInit);
  } catch (err) {
    console.error(`[BFF] Fetch error for ${url}:`, err);
    return NextResponse.json(
      { statusCode: 502, message: "Backend unavailable", error: "Bad Gateway" },
      { status: 502 },
    );
  }

  // Read the response body
  const responseBody: unknown = await (async () => {
    const contentType = nestResponse.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return nestResponse.json();
    }
    return nestResponse.text();
  })();

  // Build the NextResponse
  const response =
    typeof responseBody === "string"
      ? new NextResponse(responseBody, { status: nestResponse.status })
      : NextResponse.json(responseBody, { status: nestResponse.status });

  // Copy over headers from Nest response (except set-cookie which we handle below)
  nestResponse.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== "set-cookie" && lower !== "content-encoding" && lower !== "transfer-encoding") {
      response.headers.set(key, value);
    }
  });

  // Handle Set-Cookie from Nest (refresh token)
  const setCookieHeader = nestResponse.headers.get("set-cookie");
  const refreshTokenValue = parseCookieValue(setCookieHeader, REFRESH_COOKIE);

  // --- Auth response handling: manage session & refresh cookies ---
  const isAuthPath = AUTH_PATHS.has(path);
  const isSuccess = nestResponse.status >= 200 && nestResponse.status < 300;

  if (isAuthPath && isSuccess) {
    // Extract accessToken from JSON response body
    const jsonResponseBody = typeof responseBody === "object" ? responseBody as Record<string, unknown> : null;
    const accessToken = typeof jsonResponseBody?.accessToken === "string" ? jsonResponseBody.accessToken : null;

    if (accessToken) {
      // Set the session cookie with the access token
      response.cookies.set(SESSION_COOKIE, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 15, // 15 minutes (matches JWT_ACCESS_EXPIRES_IN)
      });
    }

    if (refreshTokenValue) {
      // Forward the refresh cookie from Nest to the browser
      response.cookies.set(REFRESH_COOKIE, refreshTokenValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/v1/bff",
        maxAge: 60 * 60 * 24 * 30, // 30 days (matches JWT_REFRESH_EXPIRES_IN)
      });
    }
  }

  // Handle logout: clear both cookies
  if (path === "/auth/logout" && (nestResponse.status === 200 || nestResponse.status === 401)) {
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    response.cookies.set(REFRESH_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/v1/bff",
      maxAge: 0,
    });
  }

  // Store successful public responses in the edge cache
  if (useCache && cacheTtl !== null && isSuccess) {
    await writeEdgeCache(url, responseBody, cacheTtl);
  }

  return response;
}

// Export handler for all HTTP methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;

// --- Helpers ---

type NextMethodRequest = NextRequest & { method: string };

/**
 * Cloudflare Workers exposes `caches.default`. On other runtimes (local dev
 * with Node) it's absent, so these helpers degrade to a no-op.
 */
function getEdgeCache(): Cache | null {
  const store = (globalThis as { caches?: { default?: Cache } }).caches;
  return store?.default ?? null;
}

async function readEdgeCache(url: string): Promise<NextResponse | null> {
  const cache = getEdgeCache();
  if (!cache) return null;
  try {
    const hit = await cache.match(new Request(url));
    if (!hit) return null;
    const body: unknown = await hit.json();
    const res = NextResponse.json(body, { status: 200 });
    res.headers.set("x-bff-cache", "HIT");
    return res;
  } catch {
    return null;
  }
}

async function writeEdgeCache(
  url: string,
  body: unknown,
  ttlSeconds: number,
): Promise<void> {
  const cache = getEdgeCache();
  if (!cache) return;
  try {
    const payload = new Response(JSON.stringify(body), {
      headers: {
        "content-type": "application/json",
        "cache-control": `public, max-age=${ttlSeconds}`,
      },
    });
    await cache.put(new Request(url), payload);
  } catch {
    // Cache write failures must never break the request
  }
}

function getPath(request: NextMethodRequest): string {
  // Extract the path after /api/v1/bff/
  const url = new URL(request.url);
  const segments = url.pathname.split("/").filter(Boolean);
  // Remove "api", "v1", "bff" prefix
  const bffIndex = segments.findIndex((s) => s === "bff");
  const path = bffIndex >= 0 ? segments.slice(bffIndex + 1).join("/") : segments.join("/");
  return `/${path}`;
}

/**
 * Parse a specific cookie value from a Set-Cookie header string.
 * Example: "nl_refresh=nl_rt_abc123; Path=/api/v1/auth; HttpOnly"
 */
function parseCookieValue(setCookieHeader: string | null, cookieName: string): string | null {
  if (!setCookieHeader) return null;
  // Handle multiple Set-Cookie headers (joined by comma by Headers API)
  const cookies = setCookieHeader.split(",").map((s) => s.trim());
  for (const cookie of cookies) {
    const eqIndex = cookie.indexOf("=");
    if (eqIndex === -1) continue;
    const name = cookie.slice(0, eqIndex).trim();
    if (name === cookieName) {
      const valueEnd = cookie.indexOf(";", eqIndex);
      return valueEnd === -1
        ? cookie.slice(eqIndex + 1).trim()
        : cookie.slice(eqIndex + 1, valueEnd).trim();
    }
  }
  return null;
}
