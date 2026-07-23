"use client";

import { useCallback } from "react";
import { MessageCircleIcon } from "lucide-react";
import { useEffect } from "react";
import {
  useConversation,
  useMessages,
  useChatSocket,
  useSendMessage,
  useTypingIndicator,
  useChatCleanup,
  useMarkAsRead,
} from "@/features/chat/hooks";
import { ChatWindow } from "@/components/chat/chat-window";
import { ChatInput } from "@/components/chat/chat-input";
import { TypingIndicator } from "@/components/chat/typing-indicator";

export function ChatPageClient() {
  const { data: conversation, isLoading: convLoading } = useConversation();
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: msgsLoading,
  } = useMessages(conversation?.id);
  const { mutate: sendMessage, isPending: sending } = useSendMessage(
    conversation?.id,
  );
  const { startTyping } = useTypingIndicator(conversation?.id);

  const { mutate: markAsRead } = useMarkAsRead();

  // Mark messages as read when opening chat
  useEffect(() => {
    if (conversation?.id) {
      markAsRead(conversation.id);
    }
  }, [conversation?.id, markAsRead]);

  // Connect to WebSocket
  useChatSocket(conversation?.id);
  useChatCleanup();

  const allMessages = messagesData?.pages.flat() ?? [];
  const isClosed = conversation?.status === "CLOSED";

  const handleSend = useCallback(
    (content: string) => {
      if (!conversation?.id) return;
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sendMessage({ content, tempId });
    },
    [conversation?.id, sendMessage],
  );

  if (convLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Memuat percakapan...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <MessageCircleIcon className="size-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Gagal memuat percakapan
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircleIcon className="size-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-medium">Dukungan</h2>
            <p className="text-xs text-muted-foreground">
              {isClosed
                ? "Percakapan ditutup"
                : "Kami akan membalas segera"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ChatWindow
        messages={allMessages}
        hasMore={!!hasNextPage}
        onLoadMore={() => fetchNextPage()}
        isLoadingMore={isFetchingNextPage}
        isLoading={msgsLoading}
      />

      <TypingIndicator isTyping={false} />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        isPending={sending}
        isClosed={isClosed}
        onTyping={startTyping}
      />
    </div>
  );
}
