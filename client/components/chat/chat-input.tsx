"use client";

import { useState, useRef, useCallback } from "react";
import { SendIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  onSend: (content: string) => void;
  isPending: boolean;
  isClosed: boolean;
  onTyping?: () => void;
}

export function ChatInput({
  onSend,
  isPending,
  isClosed,
  onTyping,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isPending || isClosed) return;
    onSend(trimmed);
    setValue("");
    inputRef.current?.focus();
  }, [value, isPending, isClosed, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isClosed) {
    return (
      <div className="border-t border-border px-4 py-3">
        <p className="text-center text-sm text-muted-foreground">
          Percakapan ini telah ditutup
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-t border-border px-4 py-3">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onTyping?.();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Ketik pesan..."
        disabled={isPending}
        className="flex-1"
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={!value.trim() || isPending}
        className="size-9 shrink-0"
      >
        {isPending ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <SendIcon className="size-4" />
        )}
      </Button>
    </div>
  );
}
