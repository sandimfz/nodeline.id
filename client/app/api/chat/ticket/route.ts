import { NextRequest, NextResponse } from "next/server";

/**
 * BFF Route Handler for generating a one-time WebSocket ticket.
 *
 * Reads the httpOnly session cookie (nl_session), attaches it as
 * Authorization header, then calls NestJS's POST /chat/ws-ticket
 * to get a one-time ticket. The ticket is returned to the client
 * for Socket.IO handshake.
 *
 * This keeps the JWT access token away from client-side JavaScript.
 */

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000/api/v1";
const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "nl_session";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return NextResponse.json(
      { statusCode: 401, message: "Unauthorized", error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const nestResponse = await fetch(`${API_BASE}/chat/ws-ticket`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!nestResponse.ok) {
      return NextResponse.json(
        { statusCode: 502, message: "Backend error", error: "Bad Gateway" },
        { status: 502 },
      );
    }

    const data = await nestResponse.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[Ticket BFF] Fetch error:", err);
    return NextResponse.json(
      { statusCode: 502, message: "Backend unavailable", error: "Bad Gateway" },
      { status: 502 },
    );
  }
}
