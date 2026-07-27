"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  IconReceipt,
  IconUpload,
  IconClock,
  IconCircleCheck,
  IconCircleX,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/lib/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from "@/features/api-keys/hooks";
import { queryKeys } from "@/lib/query-keys";
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
  const [activeTab, setActiveTab] = useState<"keys" | "orders">("keys");

  // Support ?tab=orders from redirect
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("tab") === "orders") {
      setActiveTab("orders");
    }
  }, [searchParams]);

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
      toast.success("Prefix API Key disalin!");
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
            Kelola API key dan langganan API
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "keys" | "orders")}>
        <TabsList variant="line">
          <TabsTrigger value="keys">
            <IconKey className="mr-1.5 size-3.5" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="orders">
            <IconReceipt className="mr-1.5 size-3.5" />
            Subscription Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="mt-4 space-y-4">
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
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <SubscriptionOrdersSection />
        </TabsContent>
      </Tabs>
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
                {visible ? `${apiKey.keyPrefix}${"•".repeat(20)}` : maskKey(apiKey.keyPrefix)}
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
                  title="Copy prefix (full key hanya ditampilkan saat pertama dibuat)"
                >
                  <IconCopy className="size-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              Full key hanya ditampilkan sekali saat pertama dibuat
            </p>

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


// ─── Subscription Orders Section ─────────────────────────────

interface SubscriptionOrder {
  id: string;
  serviceId: string;
  planId: string;
  status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED";
  totalCents: number;
  paymentProofUrl: string | null;
  paymentNote: string | null;
  cancellationNote: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const ORDER_STATUS_CONFIG = {
  PENDING_PAYMENT: { label: "Menunggu Pembayaran", icon: IconClock, color: "text-amber-600", bg: "bg-amber-500/10" },
  CONFIRMED: { label: "Dikonfirmasi", icon: IconCircleCheck, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  CANCELLED: { label: "Dibatalkan", icon: IconCircleX, color: "text-red-600", bg: "bg-red-500/10" },
};

function SubscriptionOrdersSection() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery<SubscriptionOrder[]>({
    queryKey: queryKeys.apiDirectory.subscriptionOrders(),
    queryFn: async () => {
      const res = await fetch("/api/v1/bff/api-services/subscription-orders/mine");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30_000,
  });

  const uploadProofMutation = useMutation({
    mutationFn: async ({ orderId, file }: { orderId: string; file: File }) => {
      // 1. Upload file to storage
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "payment-proof");

      const uploadRes = await fetch("/api/v1/bff/storage/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Gagal upload bukti pembayaran");
      const { url } = await uploadRes.json();

      // 2. Attach proof URL to order
      const patchRes = await fetch(`/api/v1/bff/api-services/subscription-orders/${orderId}/payment-proof`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentProofUrl: url }),
      });
      if (!patchRes.ok) throw new Error("Gagal menyimpan bukti pembayaran");
      return patchRes.json();
    },
    onSuccess: () => {
      toast.success("Bukti pembayaran berhasil diupload!");
      queryClient.invalidateQueries({ queryKey: queryKeys.apiDirectory.subscriptionOrders() });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleUploadProof = (orderId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        uploadProofMutation.mutate({ orderId, file });
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <IconReceipt className="mb-4 size-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">
            Belum ada subscription order
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Subscribe ke plan berbayar di API Directory untuk melihat order di sini
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const statusConf = ORDER_STATUS_CONFIG[order.status];
        const StatusIcon = statusConf.icon;

        return (
          <Card key={order.id} className="transition-colors hover:border-border/80">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`flex size-7 items-center justify-center rounded-md ${statusConf.bg}`}>
                      <StatusIcon className={`size-4 ${statusConf.color}`} />
                    </div>
                    <span className="font-medium text-sm">{statusConf.label}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      #{order.id.slice(0, 8)}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Total: Rp {order.totalCents.toLocaleString("id-ID")}</span>
                    <span>Dibuat: {formatDate(order.createdAt)}</span>
                    {order.confirmedAt && <span>Dikonfirmasi: {formatDate(order.confirmedAt)}</span>}
                  </div>

                  {order.paymentProofUrl && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600">
                      <IconCheck className="size-3.5" />
                      <span>Bukti pembayaran sudah diupload</span>
                    </div>
                  )}

                  {order.cancellationNote && (
                    <p className="text-xs text-red-600 bg-red-500/5 rounded px-2 py-1">
                      Alasan: {order.cancellationNote}
                    </p>
                  )}
                </div>

                {/* Upload proof button */}
                {order.status === "PENDING_PAYMENT" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUploadProof(order.id)}
                    disabled={uploadProofMutation.isPending}
                  >
                    <IconUpload className="mr-1.5 size-3.5" />
                    {order.paymentProofUrl ? "Ganti Bukti" : "Upload Bukti"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
