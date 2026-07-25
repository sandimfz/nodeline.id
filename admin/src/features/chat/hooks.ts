import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchConversations,
  fetchMessages,
  closeConversation,
} from "./api";
import { getSocket } from "./socket";
import type { Message } from "./types";

/** Get all conversations (god only) */
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.chat.conversations.list,
    queryFn: fetchConversations,
    refetchInterval: 10_000, // Poll every 10s for new conversations
  });
}

/** Get messages for a conversation (god only) */
export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.chat.messages(conversationId ?? ""),
    queryFn: () => fetchMessages(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 30_000, // Poll as fallback; main updates via WebSocket
  });
}

/**
 * Hook to connect to WebSocket and handle realtime events for a conversation.
 * Subscribes to message:new and appends to the TanStack Query cache.
 * Admin sends messages via REST (which broadcasts via gateway), so this
 * hook only handles receiving realtime events.
 * Socket is a singleton — don't close on unmount, keep alive for the
 * duration of the admin session.
 */
export function useChatSocket(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    const id = conversationId;

    let mounted = true;

    async function connect() {
      try {
        const socket = await getSocket();
        if (!mounted) return;
        socketRef.current = Promise.resolve(socket);

        // Join conversation room
        socket.emit("conversation:join", { conversationId: id });

        // Handle new messages
        socket.on("message:new", (message: Message) => {
          // Append to messages cache
          queryClient.setQueryData<Message[]>(
            queryKeys.chat.messages(id),
            (old) => {
              if (!old) return old;
              // Cek duplikat
              const exists = old.some((msg) => msg.id === message.id);
              if (exists) return old;
              return [...old, message];
            },
          );
        });

        // Handle conversation closed
        socket.on("conversation:closed", () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.chat.conversations.list,
          });
        });

        // Handle errors
        socket.on("error", (err: { code: string; message: string }) => {
          console.error("[Admin Chat WS Error]", err.code, err.message);
        });
      } catch (err) {
        console.error("[Admin Chat] Failed to connect socket:", err);
      }
    }

    connect();

    return () => {
      mounted = false;
      // Leave conversation room on unmount — socket stays connected
      if (socketRef.current) {
        socketRef.current.then((s) => {
          s.emit("conversation:leave", { conversationId });
        }).catch(() => {});
      }
    };
  }, [conversationId, queryClient]);
}

/** Close a conversation (god only) */
export function useCloseConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => closeConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations.list,
      });
    },
  });
}
