import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Clock,
  CheckCircle2,
  Send,
  Search,
  ExternalLink,
  RefreshCw,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllOrders, useConfirmPayment } from "@/features/marketplace/hooks";
import { ADMIN_BASE } from "@/lib/config";
import { useToast } from "@/lib/toast";
import { extractApiError } from "@/lib/api-client";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING_PAYMENT_CONFIRMATION: { label: "Menunggu Pembayaran", variant: "destructive" },
  PAID_PENDING_FULFILLMENT: { label: "Dibayar", variant: "secondary" },
  FULFILLED: { label: "Selesai", variant: "default" },
};

export function AllOrdersPage() {
  const { data: orders, isLoading } = useAllOrders();
  const confirmPayment = useConfirmPayment();
  const toast = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let result = orders;
    if (filter !== "all") {
      result = result.filter((o) => o.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.buyerName.toLowerCase().includes(q) ||
          o.buyerEmail.toLowerCase().includes(q) ||
          o.whatsappNumber.includes(q) ||
          o.id.toLowerCase().includes(q),
      );
    }
    return result;
  }, [orders, filter, search]);

  const stats = useMemo(() => {
    if (!orders) return { total: 0, pending: 0, paid: 0, fulfilled: 0 };
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "PENDING_PAYMENT_CONFIRMATION").length,
      paid: orders.filter((o) => o.status === "PAID_PENDING_FULFILLMENT").length,
      fulfilled: orders.filter((o) => o.status === "FULFILLED").length,
    };
  }, [orders]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Semua Pesanan</h1>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Semua Pesanan
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola dan pantau semua pesanan dari semua produk
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
            <Clock className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-destructive">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dibayar</CardTitle>
            <Send className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-amber-600 dark:text-amber-400">{stats.paid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">{stats.fulfilled}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Semua ({stats.total})
        </Button>
        <Button
          variant={filter === "PENDING_PAYMENT_CONFIRMATION" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("PENDING_PAYMENT_CONFIRMATION")}
        >
          Menunggu ({stats.pending})
        </Button>
        <Button
          variant={filter === "PAID_PENDING_FULFILLMENT" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("PAID_PENDING_FULFILLMENT")}
        >
          Dibayar ({stats.paid})
        </Button>
        <Button
          variant={filter === "FULFILLED" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("FULFILLED")}
        >
          Selesai ({stats.fulfilled})
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari pembeli/email/WA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-48 pl-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="mb-3 size-10 text-emerald-500" />
            <p className="text-lg font-medium">
              {filter === "all" ? "Belum ada pesanan" : "Tidak ada pesanan dengan status ini"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{order.buyerName}</p>
                  <Badge
                    variant={STATUS_MAP[order.status]?.variant ?? "outline"}
                    className="shrink-0 text-[10px]"
                  >
                    {STATUS_MAP[order.status]?.label ?? order.status}
                  </Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{order.buyerEmail}</span>
                  <span>
                    Rp {order.totalCents.toLocaleString("id-ID")}
                  </span>
                  <span>{order.itemCount} item</span>
                  <span>{order.whatsappNumber}</span>
                  <span>
                    {new Date(order.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              <div className="ml-4 flex shrink-0 items-center gap-2">
                {order.status === "PENDING_PAYMENT_CONFIRMATION" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={
                      confirmPayment.isPending && confirmingId === order.id
                    }
                    onClick={() => {
                      setConfirmingId(order.id);
                      confirmPayment.mutate(
                        { orderId: order.id },
                        {
                          onSuccess: (data) => {
                            if (data.status === "FULFILLED") {
                              toast.success("Pembayaran dikonfirmasi!");
                            } else {
                              toast.info("Pembayaran dikonfirmasi, menunggu stok...");
                            }
                          },
                          onError: (err: unknown) => {
                            toast.error(extractApiError(err));
                          },
                          onSettled: () => setConfirmingId(null),
                        },
                      );
                    }}
                  >
                    {confirmPayment.isPending && confirmingId === order.id ? (
                      <RefreshCw className="size-3 animate-spin" />
                    ) : (
                      <Check className="size-3" />
                    )}
                    <span className="ml-1">Konfirmasi</span>
                  </Button>
                )}
                <Link to={`${ADMIN_BASE}/dashboard/orders/${order.id}`}>
                  <Button variant="ghost" size="icon" className="size-8">
                    <ExternalLink className="size-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
