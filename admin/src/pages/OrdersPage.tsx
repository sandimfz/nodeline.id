import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  CheckCircle2,
  Clock,
  Package,
  TrendingUp,
  ExternalLink,
  Check,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useProducts, useConfirmPayment } from "@/features/marketplace/hooks";
import { ADMIN_BASE } from "@/lib/config";
import { usePendingOrders } from "@/features/marketplace/hooks";

function ProductOrderCard({
  productId,
  productName,
  productImage,
}: {
  productId: string;
  productName: string;
  productImage: string | null;
}) {
  const { data: pendingOrders, isLoading } = usePendingOrders(productId);
  const confirmPayment = useConfirmPayment();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (isLoading) return null;
  if (!pendingOrders || pendingOrders.length === 0) return null;

  const totalPending = pendingOrders.filter(
    (o) => o.status === "PENDING_PAYMENT_CONFIRMATION",
  ).length;
  const totalPaid = pendingOrders.filter(
    (o) => o.status === "PAID_PENDING_FULFILLMENT",
  ).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {productImage ? (
              <img
                src={productImage}
                alt={productName}
                className="size-10 rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted">
                <Package className="size-4 text-muted-foreground" />
              </div>
            )}
            <div>
              <CardTitle className="text-sm font-medium">
                {productName}
              </CardTitle>
              <div className="mt-1 flex items-center gap-2">
                {totalPending > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {totalPending} menunggu
                  </Badge>
                )}
                {totalPaid > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {totalPaid} dibayar
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Link
            to={`${ADMIN_BASE}/dashboard/products/${productId}`}
          >
            <Button variant="ghost" size="icon" className="size-8">
              <ExternalLink className="size-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {pendingOrders.map((order) => (
          <div
            key={order.orderId}
            className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{order.buyerName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {order.buyerEmail} · Rp{" "}
                {order.totalCents.toLocaleString("id-ID")} · Qty {order.quantity}
              </p>
              {order.paymentNote && (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  Catatan: {order.paymentNote}
                </p>
              )}
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-2">
              <Badge
                variant={
                  order.status === "PENDING_PAYMENT_CONFIRMATION"
                    ? "destructive"
                    : "secondary"
                }
                className="text-[10px]"
              >
                {order.status === "PENDING_PAYMENT_CONFIRMATION"
                  ? "Pending"
                  : "Dibayar"}
              </Badge>
              {order.status === "PENDING_PAYMENT_CONFIRMATION" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={confirmPayment.isPending && confirmingId === order.orderId}
                  onClick={() => {
                    setConfirmingId(order.orderId);
                    confirmPayment.mutate(
                      { orderId: order.orderId },
                      {
                        onSettled: () => setConfirmingId(null),
                      },
                    );
                  }}
                >
                  {confirmPayment.isPending &&
                  confirmingId === order.orderId ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Check data-icon="inline-start" />
                  )}
                  Konfirmasi
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function OrdersPage() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const [showAll, setShowAll] = useState(false);

  if (productsLoading) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Pesanan</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  const productsWithOrders = products?.filter((p) => p.stockStatus != null);
  const activeProducts = products?.filter((p) => p.isActive) ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pesanan</h1>
        <p className="text-sm text-muted-foreground">
          Konfirmasi pembayaran &amp; kelola pesanan dari semua produk
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Produk Aktif
            </CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeProducts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Potensi Pendapatan
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              Rp{" "}
              {(products ?? [])
                .filter((p) => p.isActive)
                .reduce((sum, p) => sum + p.priceCents, 0)
                .toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-muted-foreground">Total harga produk aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Aksi Cepat
            </CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Link to={`${ADMIN_BASE}/dashboard/products`}>
              <Button variant="outline" size="sm" className="w-full text-xs">
                <ShoppingCart data-icon="inline-start" />
                Kelola Produk
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Orders list per product */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Pesanan per Produk
          </h2>
          {productsWithOrders && productsWithOrders.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-xs"
            >
              {showAll ? "Sembunyikan" : `Lihat Semua`}
            </Button>
          )}
        </div>

        {(showAll ? productsWithOrders : productsWithOrders?.slice(0, 10))?.map(
          (product) => (
            <ProductOrderCard
              key={product.id}
              productId={product.id}
              productName={product.name}
              productImage={product.imageUrl}
            />
          ),
        )}

        {(!productsWithOrders || productsWithOrders.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="mb-3 size-10 text-muted-foreground" />
              <p className="text-lg font-medium">
                Tidak ada pesanan
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Belum ada pesanan yang menunggu konfirmasi. Cek lagi nanti.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
