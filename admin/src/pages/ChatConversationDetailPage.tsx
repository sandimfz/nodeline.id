import { useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  SendIcon,
  XCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import {
  useMessages,
  useCloseConversation,
  useChatSocket,
} from "@/features/chat/hooks";
import api from "@/lib/api-client";

export function ChatConversationDetailPage() {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: messages = [], isLoading } = useMessages(conversationId);
  const { mutate: closeConv, isPending: closing } = useCloseConversation();

  // Connect to WebSocket for real-time messages (replaces polling)
  useChatSocket(conversationId);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || !conversationId || sending) return;

    setSending(true);
    setInput("");

    try {
      await api.post(`/chat/conversations/${conversationId}/messages`, { content });
    } catch {
      // Silent fail — WebSocket will pick up realtime updates
    } finally {
      setSending(false);
    }
  }, [input, conversationId, sending]);

  const handleClose = () => {
    if (!conversationId) return;
    closeConv(conversationId, {
      onSuccess: () => navigate("../"),
    });
  };

  // Group messages by sender role
  const displayMessages = [...messages].reverse();

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("../")}
          className="size-8"
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-sm font-medium">
            User {conversationId?.slice(0, 8)}
          </h2>
          <p className="text-xs text-muted-foreground">Realtime</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClose}
          disabled={closing}
          className="text-destructive"
        >
          <XCircleIcon data-icon="inline-start" />
          Tutup
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner className="size-5 text-muted-foreground" />
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Belum ada pesan
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayMessages.map((msg) => {
              const isAdmin = msg.senderRole === "god";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      isAdmin
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                    <p
                      className={`mt-1 text-right text-[10px] ${
                        isAdmin
                          ? "text-primary-foreground/60"
                          : "text-muted-foreground/60"
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ketik balasan..."
          className="flex-1"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="size-9 shrink-0"
        >
          {sending ? (
            <Spinner />
          ) : (
            <SendIcon className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
