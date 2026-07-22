import { useNavigate } from "react-router-dom";
import { MessageCircleIcon, ClockIcon, CheckCheckIcon, XIcon } from "lucide-react";
import { useConversations } from "@/features/chat/hooks";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function ChatConversationsPage() {
  const { data: conversations = [], isLoading } = useConversations();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Memuat percakapan...</p>
      </div>
    );
  }

  const openConversations = conversations.filter((c) => c.status === "OPEN");
  const closedConversations = conversations.filter((c) => c.status === "CLOSED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Percakapan</h1>
        <p className="text-sm text-muted-foreground">
          {openConversations.length} percakapan aktif
        </p>
      </div>

      {/* Open conversations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircleIcon className="size-4 text-emerald-500" />
            Aktif
            <Badge variant="secondary" className="ml-auto">
              {openConversations.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {openConversations.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Tidak ada percakapan aktif
            </p>
          ) : (
            openConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate(conv.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                  <MessageCircleIcon className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">
                    User {conv.userId.slice(0, 8)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {conv.lastMessageAt
                      ? new Date(conv.lastMessageAt).toLocaleString("id-ID")
                      : "Belum ada pesan"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {conv.assignedAdminId ? (
                    <Badge variant="outline" className="text-[10px]">
                      Ada admin
                    </Badge>
                  ) : null}
                  <ClockIcon className="size-4 text-muted-foreground/50" />
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Closed conversations */}
      {closedConversations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <XIcon className="size-4 text-muted-foreground" />
              Ditutup
              <Badge variant="secondary" className="ml-auto">
                {closedConversations.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {closedConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate(conv.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <CheckCheckIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-muted-foreground">
                    User {conv.userId.slice(0, 8)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Ditutup
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
