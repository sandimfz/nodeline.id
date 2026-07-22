"use client";

import Link from "next/link";
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ShoppingBagIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrders } from "@/features/marketplace/hooks";
import type { Order, OrderStatus } from "@/features/marketplace/types";

function formatPrice(cents: number): string {
  return `Rp ${cents.toLocaleString("id-ID")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABELS: Record<OrderStatus, { label: string; variant: "destructive" | "secondary" | "default" | "outline" }> = {
  PENDING_PAYMENT_CONFIRMATION: { label: "Menunggu Pembayaran", variant: "destructive" },
  PAID_PENDING_FULFILLMENT: { label: "Menunggu Stok", variant: "secondary" },
  FULFILLED: { label: "Selesai", variant: "default" },
  REFUND_REQUESTED: { label: "Refund Diajukan", variant: "secondary" },
  REFUNDED: { label: "Dikembalikan", variant: "outline" },
  CANCELLED: { label: "Dibatalkan", variant: "outline" },
};

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const info = STATUS_LABELS[status] ?? { label: status, variant: "outline" as const };
  return (
    <Badge variant={info.variant} className="font-mono text-[10px] uppercase tracking-wider">
      {info.label}
    </Badge>
  );
}

export default function OrdersPage() {
  const { data: orders, isLoading, isError, refetch, isRefetching } = useOrders();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Pesanan Saya</h1>
          <p className="text-sm text-muted-foreground">
            Riwayat dan status pesanan Anda
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`mr-1.5 size-3 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertTriangle className="mb-4 size-12 text-destructive/50" />
          <p className="text-lg font-medium text-destructive">
            Gagal memuat pesanan
          </p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Coba Lagi
          </Button>
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Package className="mb-4 size-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">
            Belum ada pesanan
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Mulai belanja di marketplace
          </p>
          <Link href="/marketplace">
            <Button variant="default" className="mt-6">
              <ShoppingBagIcon className="mr-2 size-4" />
              Jelajahi Produk
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <OrderStatusBadge status={order.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        #{order.id.slice(0, 8)}
                      </span>
                    </p>
                    <p className="font-heading font-semibold">
                      {formatPrice(order.totalCents)}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
