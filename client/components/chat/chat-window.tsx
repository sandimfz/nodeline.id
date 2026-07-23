"use client";

import { useEffect, useRef } from "react";
import { Loader2Icon } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import type { Messages } from "@/features/chat/types";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import { Message, MessageAvatar, MessageContent, MessageFooter } from "@/components/ui/message";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  messages: Messages[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  isLoading: boolean;
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

function getUserInitials(name?: string): string {
  if (!name) return "U";
  return name.charAt(0).toUpperCase();
}

function formatDateSeparator(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return "Hari ini";
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Load-more trigger — rendered at the top of the scroller content.
 */
function LoadMoreTrigger({
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!triggerRef.current || !hasMore || isLoadingMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div ref={triggerRef} className="flex items-center justify-center py-2">
      {isLoadingMore && (
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

/**
 * Empty state when there are no messages.
 */
function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16 text-center">
      <p className="text-sm text-muted-foreground">
        Belum ada pesan. Kirim pesan pertama!
      </p>
    </div>
  );
}

/**
 * Loading state while initial messages are being fetched.
 */
function LoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * ChatWindow — renders the conversation using shadcn/ui chat components.
 *
 * Messages are in reverse-chronological order from the API (newest first).
 * They're displayed oldest-first, so we reverse for rendering.
 */
export function ChatWindow({
  messages,
  hasMore,
  onLoadMore,
  isLoadingMore,
  isLoading,
}: ChatWindowProps) {
  const user = useAuthStore((s) => s.user);

  // Display messages oldest-first
  const displayMessages = [...messages].reverse();

  if (isLoading) return <LoadingState />;
  if (displayMessages.length === 0) return <EmptyState />;

  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent className="px-3 gap-2 pb-4">
            {/* Load more trigger at the top (outside MessageScrollerItem to avoid content-visibility issues) */}
            <LoadMoreTrigger
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={onLoadMore}
            />

            {/* Messages */}
            {displayMessages.map((msg, idx) => {
              const isOwn =
                msg.senderId === user?.id || msg.senderId === "temp";
              const isTemp = msg.senderId === "temp";
              const isLastMessage = idx === displayMessages.length - 1;

              // Date separator
              const showDateSeparator =
                idx === 0 ||
                !isSameDay(
                  displayMessages[idx - 1]?.createdAt,
                  msg.createdAt,
                );

              return (
                <div key={msg.id}>
                  {showDateSeparator && (
                    <MessageScrollerItem>
                      <Marker variant="separator">
                        <MarkerContent>
                          {formatDateSeparator(msg.createdAt)}
                        </MarkerContent>
                      </Marker>
                    </MessageScrollerItem>
                  )}

                  <MessageScrollerItem scrollAnchor={isLastMessage}>
                    <Message align={isOwn ? "end" : "start"}>
                      <MessageAvatar>
                        <Avatar>
                          {isOwn && user?.avatarUrl ? (
                            <AvatarImage
                              src={user.avatarUrl}
                              alt={user.name ?? "Avatar"}
                            />
                          ) : null}
                          <AvatarFallback>
                            {isOwn
                              ? getUserInitials(user?.name)
                              : "A"}
                          </AvatarFallback>
                        </Avatar>
                      </MessageAvatar>
                      <MessageContent>
                        <Bubble
                          variant={isOwn ? "default" : "muted"}
                          align={isOwn ? "end" : "start"}
                        >
                          <BubbleContent
                            className={cn(isTemp && "opacity-60")}
                          >
                            <p className="whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          </BubbleContent>
                        </Bubble>
                        {isTemp && (
                          <MessageFooter>
                            • Mengirim...
                          </MessageFooter>
                        )}
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                </div>
              );
            })}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        {/* Jump to bottom button */}
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

function isSameDay(dateA: string, dateB: string): boolean {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return a.toDateString() === b.toDateString();
}
