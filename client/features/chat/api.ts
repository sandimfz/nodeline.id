import { bffFetch } from "@/lib/api-client";
import type { Conversation, Messages, TicketResponse } from "./types";

/**
 * Get or create active conversation for current user.
 */
export async function getOrCreateConversation(): Promise<Conversation> {
  return bffFetch<Conversation>("/chat/conversations", {
    method: "POST",
  });
}

/**
 * Get my active conversation.
 */
export async function getMyConversation(): Promise<{ conversation: Conversation | null }> {
  return bffFetch<{ conversation: Conversation | null }>("/chat/conversations/me");
}

/**
 * Get messages for a conversation (paginated with cursor).
 */
export async function getMessages(
  conversationId: string,
  cursor?: string,
  limit: number = 50,
): Promise<Messages[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  return bffFetch<Messages[]>(`/chat/conversations/${conversationId}/messages?${params}`);
}

/**
 * Mark messages as read in a conversation.
 */
export async function markAsRead(conversationId: string): Promise<void> {
  await bffFetch(`/chat/conversations/${conversationId}/read`, {
    method: "POST",
  });
}

/**
 * Generate a one-time WebSocket ticket via BFF.
 */
export async function getWsTicket(): Promise<TicketResponse> {
  return bffFetch<TicketResponse>("/chat/ws-ticket", {
    method: "POST",
  });
}

/**
 * Get unread message count for the current user.
 */
export async function getUnreadCount(): Promise<{ count: number }> {
  return bffFetch<{ count: number }>("/chat/unread-count");
}
