"use client";

import { useState } from "react";
import {
  IconKey,
  IconCopy,
  IconTrash,
  IconPlus,
  IconRefresh,
  IconCheck,
  IconAlertTriangle,
  IconKeyOff,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/toast";
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from "@/features/api-keys/hooks";
import type { ApiKey } from "@/features/api-keys/types";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function maskKey(prefix: string): string {
  return `${prefix}${"•".repeat(24)}`;
}

const PLAN_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  FREE: { label: "Free", variant: "secondary" },
  PRO: { label: "Pro", variant: "default" },
  ENTERPRISE: { label: "Enterprise", variant: "destructive" },
};

export default function ApiKeysPage() {
  const toast = useToast();
  const { data: keys, isLoading, refetch, isRefetching } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();

  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [visibleKeyId, setVisibleKeyId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    try {
      const result = await createKey.mutateAsync({ name: newKeyName.trim() });
      setCreatedKey(result.fullKey);
      setNewKeyName("");
      toast.success("API Key berhasil dibuat!");
    } catch {
      toast.error("Gagal membuat API Key");
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeKey.mutateAsync(id);
      toast.success("API Key berhasil di-revoke");
    } catch {
      toast.error("Gagal me-revoke API Key");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("API Key disalin!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCloseCreate = () => {
    setCreateOpen(false);
    setCreatedKey(null);
    setNewKeyName("");
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="text-sm text-muted-foreground">
            Kelola API key untuk mengakses data market real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <IconRefresh className={`mr-1.5 size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button size="sm"><IconPlus className="mr-1.5 size-3.5" />Buat Key</Button>} />
            <DialogContent>
              {createdKey ? (
                <>
                  <DialogHeader>
                    <DialogTitle>API Key Berhasil Dibuat</DialogTitle>
                    <DialogDescription>
                      Salin key ini sekarang. Kamu tidak akan bisa melihatnya lagi setelah dialog ini ditutup.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <p className="mb-2 text-xs font-medium text-emerald-600">Full API Key</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 break-all rounded bg-background px-3 py-2 font-mono text-xs">
                          {createdKey}
                        </code>
                        <Button
                          size="icon"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => handleCopy(createdKey)}
                        >
                          {copied ? (
                            <IconCheck className="size-4 text-emerald-500" />
                          ) : (
                            <IconCopy className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700">
                      <p className="font-medium">Simpan key ini di tempat aman!</p>
                      <p className="mt-1 text-amber-600/80">
                        Key ini tidak akan bisa ditampilkan lagi setelah dialog ini ditutup.
                        Jika hilang, kamu harus revoke dan buat key baru.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCloseCreate}>Tutup</Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Buat API Key Baru</DialogTitle>
                    <DialogDescription>
                      Beri nama untuk membedakan key ini dengan yang lain.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nama Key</label>
                      <Input
                        placeholder="Contoh: Production, Development"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>
                      Batal
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={!newKeyName.trim() || createKey.isPending}
                    >
                      {createKey.isPending ? "Membuat..." : "Buat Key"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info card */}
      <Card className="border-primary/10 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <IconKey className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Akses Data Market Real-time</p>
            <p className="text-muted-foreground">
              Gunakan API key untuk mengakses endpoint market data: harga real-time, candle history,
              dan indikator teknikal. Setiap request memerlukan header <code className="rounded bg-muted px-1 font-mono text-xs">Authorization: Bearer &lt;key&gt;</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Key list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : !keys || keys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <IconKeyOff className="mb-4 size-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              Belum ada API Key
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Buat key pertama untuk mulai menggunakan market data API
            </p>
            <Button
              className="mt-6"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <IconPlus className="mr-1.5 size-3.5" />
              Buat API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <ApiKeyCard
              key={key.id}
              apiKey={key}
              visible={visibleKeyId === key.id}
              onToggleVisibility={() =>
                setVisibleKeyId(visibleKeyId === key.id ? null : key.id)
              }
              onRevoke={() => handleRevoke(key.id)}
              onCopy={() => handleCopy(key.keyPrefix)}
              isRevoking={revokeKey.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ApiKeyCard({
  apiKey,
  visible,
  onToggleVisibility,
  onRevoke,
  onCopy,
  isRevoking,
}: {
  apiKey: ApiKey;
  visible: boolean;
  onToggleVisibility: () => void;
  onRevoke: () => void;
  onCopy: () => void;
  isRevoking: boolean;
}) {
  const planInfo = PLAN_BADGE[apiKey.plan] ?? PLAN_BADGE.FREE;

  return (
    <Card className="transition-colors hover:border-border/80">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            {/* Name + Plan badge */}
            <div className="flex items-center gap-2">
              <span className="font-medium">{apiKey.name}</span>
              <Badge variant={planInfo.variant} className="font-mono text-[10px] uppercase">
                {planInfo.label}
              </Badge>
              {!apiKey.isActive && (
                <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                  Revoked
                </Badge>
              )}
            </div>

            {/* Key preview */}
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                {visible ? apiKey.keyPrefix : maskKey(apiKey.keyPrefix)}
              </code>
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                onClick={onToggleVisibility}
              >
                {visible ? (
                  <IconEyeOff className="size-3.5 text-muted-foreground" />
                ) : (
                  <IconEye className="size-3.5 text-muted-foreground" />
                )}
              </Button>
              {apiKey.isActive && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={onCopy}
                >
                  <IconCopy className="size-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Rate limit: {apiKey.rateLimitPerMin}/min</span>
              <span>Dibuat: {formatDate(apiKey.createdAt)}</span>
              <span>Terakhir: {formatDate(apiKey.lastUsedAt)}</span>
            </div>
          </div>

          {/* Revoke button */}
          {apiKey.isActive && (
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive"><IconTrash className="size-4" /></Button>} />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cabut API Key</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apakah kamu yakin ingin me-revoke key <strong>{apiKey.name}</strong>?
                    <br />
                    Semua aplikasi yang menggunakan key ini akan kehilangan akses secara instan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={onRevoke}
                    disabled={isRevoking}
                  >
                    {isRevoking ? "Revoking..." : "Revoke Key"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
