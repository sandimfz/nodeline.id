import { io, Socket } from "socket.io-client";
import { getWsTicket } from "./api";

/**
 * Socket.IO client instance.
 * Auto-reconnect with fresh ticket each time.
 */
let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Get or create the singleton socket connection.
 * Fetches a fresh ticket before connecting.
 */
export async function getSocket(): Promise<Socket> {
  if (socket?.connected) {
    return socket;
  }

  // Close existing if disconnected
  if (socket) {
    socket.removeAllListeners();
    socket.close();
    socket = null;
  }

  // Fetch ticket from BFF
  const { ticket } = await getWsTicket();

  return new Promise((resolve, reject) => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3000";

    socket = io(`${wsUrl}/chat`, {
      auth: { ticket },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      reconnectAttempts = 0;
      resolve(socket!);
    });

    socket.on("connect_error", (err) => {
      reconnectAttempts++;
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        reject(err);
      }
    });

    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        // Server initiated disconnect — don't reconnect
        socket?.removeAllListeners();
        socket = null;
      }
    });
  });
}

/**
 * Close the socket connection.
 */
export function closeSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.close();
    socket = null;
  }
}

/**
 * Reconnect with a fresh ticket (called when ticket expired).
 */
export async function reconnectSocket(): Promise<Socket> {
  closeSocket();
  return getSocket();
}
