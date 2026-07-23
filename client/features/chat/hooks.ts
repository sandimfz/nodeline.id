"use client";

import { useEffect, useCallback, useRef } from "react";
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { getSocket, closeSocket } from "./socket";
import type { Messages } from "./types";
import { queryKeys } from "@/lib/query-keys";
import {
  getOrCreateConversation,
  getMyConversation,
  getMessages,
  markAsRead,
  getUnreadCount,
} from "./api";

/**
 * Get or create conversation for the current user.
 */
export function useConversation() {
  return useQuery({
    queryKey: queryKeys.chat.conversations.me,
    queryFn: () => getOrCreateConversation(),
    staleTime: 30_000,
  });
}

/**
 * Get my active conversation (user) — returns null if none.
 * Separate queryKey from useConversation() to avoid cache collision.
 */
export function useMyConversation() {
  return useQuery({
    queryKey: queryKeys.chat.conversations.myActive,
    queryFn: async () => {
      const result = await getMyConversation();
      return result.conversation;
    },
    staleTime: 30_000,
  });
}

/**
 * Get messages for a conversation with infinite scroll (cursor-based).
 */
export function useMessages(conversationId: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.chat.messages(conversationId ?? ""),
    queryFn: ({ pageParam }) =>
      getMessages(conversationId!, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage, allPages) => {
      // If we got fewer than the limit (50), there are no more
      if (lastPage.length < 50) return undefined;
      // Last item's createdAt is the cursor for the next page
      const lastItem = lastPage[lastPage.length - 1];
      return lastItem?.createdAt;
    },
    enabled: !!conversationId,
    staleTime: 30_000,
  });
}

/**
 * Hook to connect to WebSocket and handle realtime events for a conversation.
 * Subscribes to message:new and appends to the cache.
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
        socket.on("message:new", (message: Messages) => {
          // Append to infinite query cache, skip if already exists (optimistic ack)
          queryClient.setQueryData<{
            pages: Messages[][];
            pageParams: unknown[];
          }>(queryKeys.chat.messages(id), (old) => {
            if (!old) return old;
            // Cek duplikat: jika pesan dengan ID ini sudah ada, skip
            const exists = old.pages.some((page) =>
              page.some((msg) => msg.id === message.id),
            );
            if (exists) return old;
            const [firstPage, ...rest] = old.pages;
            return {
              ...old,
              pages: [[message, ...firstPage], ...rest],
            };
          });

          // Update unread count in realtime
          queryClient.invalidateQueries({
            queryKey: queryKeys.chat.unreadCount,
          });
        });

        // Handle conversation closed
        socket.on("conversation:closed", () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.chat.conversations.all,
          });
        });

        // Handle errors
        socket.on("error", (err: { code: string; message: string }) => {
          console.error("[Chat WS Error]", err.code, err.message);
        });
      } catch (err) {
        console.error("[Chat] Failed to connect socket:", err);
      }
    }

    connect();

    return () => {
      mounted = false;
      // Leave conversation room on unmount
      if (socketRef.current) {
        socketRef.current.then((s) => {
          s.emit("conversation:leave", { conversationId });
        }).catch(() => {});
      }
    };
  }, [conversationId, queryClient]);
}

/**
 * Send a message with optimistic update.
 */
export function useSendMessage(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      content,
      tempId,
    }: {
      content: string;
      tempId: string;
    }) => {
      const socket = await getSocket();
      socket.emit("message:send", { conversationId, content, tempId });

      // Return a promise that resolves on ack
      return new Promise<{ tempId: string; message: Messages }>(
        (resolve, reject) => {
          const timeout = setTimeout(() => {
            socket.off("message:ack");
            socket.off("error");
            reject(new Error("Timeout"));
          }, 10_000);

          socket.on("message:ack", (ack) => {
            clearTimeout(timeout);
            resolve(ack);
          });

          socket.on("error", (err: { code: string; message: string }) => {
            clearTimeout(timeout);
            reject(new Error(err.message));
          });
        },
      );
    },
    onMutate: async ({ content, tempId }) => {
      if (!conversationId) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.chat.messages(conversationId),
      });

      // Snapshot previous messages
      const previous = queryClient.getQueryData<
        { pages: Messages[][]; pageParams: unknown[] }
      >(queryKeys.chat.messages(conversationId));

      // Optimistically add the message
      const optimisticMessage: Messages = {
        id: tempId,
        conversationId,
        senderId: "temp",
        senderRole: "user",
        content,
        attachmentUrl: null,
        readAt: null,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<
        { pages: Messages[][]; pageParams: unknown[] }
      >(queryKeys.chat.messages(conversationId), (old) => {
        if (!old) return old;
        const [firstPage, ...rest] = old.pages;
        return {
          ...old,
          pages: [[optimisticMessage, ...firstPage], ...rest],
        };
      });

      return { previous };
    },
    onError: (err, { tempId }, context) => {
      if (!conversationId) return;
      // Rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.chat.messages(conversationId),
          context.previous,
        );
      }
    },
    onSuccess: ({ tempId, message }) => {
      if (!conversationId) return;
      // Replace optimistic message with real one
      queryClient.setQueryData<
        { pages: Messages[][]; pageParams: unknown[] }
      >(queryKeys.chat.messages(conversationId), (old) => {
        if (!old) return old;
        // Jika real message sudah ada (dari socket broadcast), hapus temp saja
        const alreadyExists = old.pages.some((page) =>
          page.some((msg) => msg.id === message.id),
        );
        if (alreadyExists) {
          return {
            ...old,
            pages: old.pages.map((page) =>
              page.filter((msg) => msg.id !== tempId),
            ),
          };
        }
        // Otherwise replace temp with real
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((msg) => (msg.id === tempId ? message : msg)),
          ),
        };
      });
    },
  });
}

/**
 * Typing indicator hooks.
 */
export function useTypingIndicator(conversationId: string | undefined) {
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTyping = useCallback(async () => {
    if (!conversationId) return;
    try {
      const socket = await getSocket();
      socket.emit("typing:start", { conversationId });

      // Auto-stop after 3 seconds of inactivity
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing:stop", { conversationId });
      }, 3000);
    } catch {}
  }, [conversationId]);

  const stopTyping = useCallback(async () => {
    if (!conversationId) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    try {
      const socket = await getSocket();
      socket.emit("typing:stop", { conversationId });
    } catch {}
  }, [conversationId]);

  return { startTyping, stopTyping };
}

/**
 * Mark messages as read.
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => markAsRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.unreadCount,
      });
    },
  });
}

/**
 * Get unread message count (polling every 15 seconds).
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.chat.unreadCount,
    queryFn: getUnreadCount,
    refetchInterval: 15_000,
  });
}

/**
 * Close socket connection on unmount (cleanup).
 */
export function useChatCleanup() {
  useEffect(() => {
    return () => {
      closeSocket();
    };
  }, []);
}
