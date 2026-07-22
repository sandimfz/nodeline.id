import api from "@/lib/api-client";
import type { Conversation, Message } from "./types";

/** Get all conversations (god only) */
export async function fetchConversations(): Promise<Conversation[]> {
  const res = await api.get<Conversation[]>("/chat/conversations");
  return res.data;
}

/** Get messages for a conversation (god only) */
export async function fetchMessages(
  conversationId: string,
  cursor?: string,
  limit: number = 50,
): Promise<Message[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  const res = await api.get<Message[]>(
    `/chat/conversations/${conversationId}/messages?${params}`,
  );
  return res.data;
}

/** Close a conversation (god only) */
export async function closeConversation(
  conversationId: string,
): Promise<Conversation> {
  const res = await api.patch<Conversation>(
    `/chat/conversations/${conversationId}/close`,
  );
  return res.data;
}

/** Generate a one-time WS ticket (god only) */
export async function getWsTicket(): Promise<{ ticket: string }> {
  const res = await api.post<{ ticket: string }>("/chat/ws-ticket");
  return res.data;
}
