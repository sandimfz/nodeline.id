"use client";

import { useRef, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import type { Message } from "@/features/chat/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  messages: Message[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  isLoading: boolean;
}

export function ChatWindow({
  messages,
  hasMore,
  onLoadMore,
  isLoadingMore,
  isLoading,
}: ChatWindowProps) {
  const user = useAuthStore((s) => s.user);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const prevLengthRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive (if user is at bottom)
  useEffect(() => {
    if (isAtBottom && messages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length, isAtBottom]);

  // Track scroll position
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const threshold = 100;
    setIsAtBottom(
      target.scrollHeight - target.scrollTop - target.clientHeight < threshold,
    );

    // Load more when scrolling to top
    if (target.scrollTop < 100 && hasMore && !isLoadingMore) {
      onLoadMore();
    }
  };

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Memuat pesan...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Belum ada pesan. Kirim pesan pertama!
        </p>
      </div>
    );
  }

  // Messages are in reverse chronological order (newest first from API)
  // We display them oldest first, so reverse for display
  const displayMessages = [...messages].reverse();

  return (
    <ScrollArea className="flex-1 px-4 py-4" onScroll={handleScroll}>
      {isLoadingMore && (
        <div className="py-2 text-center">
          <p className="text-xs text-muted-foreground">Memuat lebih banyak...</p>
        </div>
      )}
      {hasMore && !isLoadingMore && (
        <button
          onClick={onLoadMore}
          className="mb-2 w-full py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Muat pesan sebelumnya
        </button>
      )}

      <div className="flex flex-col gap-2">
        {displayMessages.map((msg) => {
          const isOwn = msg.senderId === user?.id || msg.senderId === "temp";
          const isTemp = msg.senderId === "temp";

          return (
            <div
              key={msg.id}
              className={cn(
                "flex",
                isOwn ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                  isOwn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                  isTemp && "opacity-60",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p
                  className={cn(
                    "mt-1 text-right text-[10px]",
                    isOwn
                      ? "text-primary-foreground/60"
                      : "text-muted-foreground/60",
                  )}
                >
                  {formatTime(msg.createdAt)}
                  {isTemp && " • Mengirim..."}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div ref={bottomRef} />
    </ScrollArea>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const time = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return time;

  return `${date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  })} ${time}`;
}
