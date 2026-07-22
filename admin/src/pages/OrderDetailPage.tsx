import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Check, RefreshCw, ImageIcon, Package, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminOrderDetail,
  useConfirmPayment,
  useManualAssignStock,
  useStockUnits,
} from "@/features/marketplace/hooks";
import { ADMIN_BASE } from "@/lib/config";
import { useState } from "react";
import { extractApiError } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

const STATUS_MAP: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; desc: string }
> = {
  PENDING_PAYMENT_CONFIRMATION: {
    label: "Menunggu Pembayaran",
    variant: "destructive",
    desc: "Pembeli sudah checkout tapi pembayaran belum dikonfirmasi admin",
  },
  PAID_PENDING_FULFILLMENT: {
    label: "Dibayar — Menunggu Stok",
    variant: "secondary",
    desc: "Pembayaran dikonfirmasi, menunggu stok tersedia untuk fulfill",
  },
  FULFILLED: {
    label: "Selesai",
    variant: "default",
    desc: "Pesanan sudah di-fulfill, pembeli bisa lihat konten",
  },
};

function parsePaymentImages(note: string | null): string[] {
  if (!note) return [];
  const urls: string[] = [];
  const regex = /\[BUKTI BAYAR\]\s*(https?:\/\/[^\s]+)/g;
  let match;
  while ((match = regex.exec(note)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

function cleanPaymentNote(note: string | null): string {
  if (!note) return "";
  return note.replace(/\[BUKTI BAYAR\]\s*(https?:\/\/[^\s]+)/g, "").trim();
}

function ManualAssignCell({
  productId,
  onAssign,
  isPending,
}: {
  productId: string;
  onAssign: (stockUnitId: string) => void;
  isPending: boolean;
}) {
  const { data: stockUnits } = useStockUnits(productId);
  const available = stockUnits?.filter((s) => s.status === "AVAILABLE") ?? [];

  if (available.length === 0) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-[10px] text-muted-foreground">Tidak ada stok</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        className="h-7 max-w-[120px] rounded-md border border-border bg-background px-2 text-[10px] outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onAssign(e.target.value);
        }}
        disabled={isPending}
      >
        <option value="" disabled>
          {available.length} unit tersedia
        </option>
        {available.map((u) => (
          <option key={u.id} value={u.id}>
            {u.content.slice(0, 24)}...
          </option>
        ))}
      </select>
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, error } = useAdminOrderDetail(id ?? "");
  const confirmPayment = useConfirmPayment();
  const manualAssign = useManualAssignStock(id ?? "");
  const toast = useToast();
  const [paymentImageError, setPaymentImageError] = useState<Set<number>>(new Set());

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-semibold">Order tidak ditemukan</p>
        <Link
          to={`${ADMIN_BASE}/dashboard/orders`}
          className="mt-2 text-sm text-primary hover:underline"
        >
          Kembali ke daftar pesanan
        </Link>
      </div>
    );
  }

  const formatPrice = (cents: number) =>
    `Rp ${cents.toLocaleString("id-ID")}`;

  const statusInfo = STATUS_MAP[order.status] ?? {
    label: order.status,
    variant: "outline" as const,
    desc: "",
  };

  const paymentImages = parsePaymentImages(order.paymentNote);
  const cleanNote = cleanPaymentNote(order.paymentNote);
  const allFulfilled = order.items.every((i) => i.fulfilled);
  const fulfilledCount = order.items.filter((i) => i.fulfilled).length;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        to={`${ADMIN_BASE}/dashboard/orders`}
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Kembali ke pesanan
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Pesanan #{order.id.slice(0, 8)}
            </h1>
            <Badge variant={statusInfo.variant} className="text-[10px]">
              {statusInfo.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {statusInfo.desc}
          </p>
        </div>
        <div className="flex gap-2">
          {order.status === "PENDING_PAYMENT_CONFIRMATION" && (
            <Button
              onClick={() =>
                confirmPayment.mutate(
                  { orderId: order.id },
                  {
                    onSuccess: (data) => {
                      if (data.status === "FULFILLED") {
                        toast.success("Pembayaran dikonfirmasi! Stok sudah di-assign.");
                      } else {
                        toast.info("Pembayaran dikonfirmasi, tapi stok belum cukup. Pesanan akan terisi otomatis saat stok ditambahkan.");
                      }
                    },
                    onError: (err: unknown) => {
                      toast.error(extractApiError(err));
                    },
                  },
                )
              }
              disabled={confirmPayment.isPending}
            >
              {confirmPayment.isPending ? (
                <>
                  <RefreshCw className="mr-1.5 size-4 animate-spin" />
                  Mengonfirmasi...
                </>
              ) : (
                <>
                  <Check className="mr-1.5 size-4" />
                  Konfirmasi Pembayaran
                </>
              )}
            </Button>
          )}
        </div>
      </div>



      <div className="grid gap-6 md:grid-cols-2">
        {/* Buyer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" />
              Informasi Pembeli
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nama</span>
              <span className="font-medium">{order.buyerName}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{order.buyerEmail}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">WhatsApp</span>
              <span className="font-mono text-xs">{order.whatsappNumber}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{formatPrice(order.totalCents)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tanggal</span>
              <span>
                {new Date(order.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="size-4" />
              Informasi Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={statusInfo.variant} className="text-[10px]">
                {statusInfo.label}
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fulfillment</span>
              <span>
                {fulfilledCount} / {order.items.length} item terpenuhi
                {allFulfilled && " "}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diupdate</span>
              <span>
                {new Date(order.updatedAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* Payment Proof Images */}
            {paymentImages.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Bukti Pembayaran
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentImages.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group relative overflow-hidden rounded-lg border border-border ${
                          paymentImageError.has(idx)
                            ? "flex items-center justify-center bg-muted p-4"
                            : ""
                        }`}
                      >
                        {paymentImageError.has(idx) ? (
                          <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                            <ImageIcon className="size-6" />
                            <span>Gagal load</span>
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt={`Bukti bayar ${idx + 1}`}
                            className="h-24 w-full object-cover transition-transform group-hover:scale-105"
                            onError={() =>
                              setPaymentImageError((prev) => new Set(prev).add(idx))
                            }
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                          <ExternalLink className="size-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Clean payment note */}
            {cleanNote && (
              <>
                <Separator />
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Catatan Pembeli
                  </p>
                  <p className="rounded-lg bg-muted/50 p-2 text-xs">{cleanNote}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>



      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-4" />
            Item Pesanan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Produk
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Harga
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Subtotal
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Stock Unit
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border transition-colors hover:bg-muted/50"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="shrink-0">
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="size-8 rounded border border-border object-cover"
                            />
                          ) : (
                            <div className="flex size-8 items-center justify-center rounded border border-border bg-muted">
                              <Package className="size-3.5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <Link
                          to={`${ADMIN_BASE}/dashboard/products/${item.productId}`}
                          className="truncate font-medium hover:text-primary"
                        >
                          {item.productName}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {formatPrice(item.priceCents)}
                    </td>
                    <td className="px-3 py-2.5">{item.quantity}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {formatPrice(item.priceCents * item.quantity)}
                    </td>
                    <td className="px-3 py-2.5">
                      {item.fulfilled ? (
                        <Badge variant="default" className="text-[10px]">
                          Terkirim
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          Belum
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {item.fulfilled ? (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {item.stockUnitIds.map((suid) => (
                            <span
                              key={suid}
                              className="inline-block truncate"
                              title={suid}
                            >
                              {suid.slice(0, 8)}...
                            </span>
                          ))}
                        </span>
                      ) : order.status === "PAID_PENDING_FULFILLMENT" ? (
                        <ManualAssignCell
                          productId={item.productId}
                          onAssign={(stockUnitId) => {
                            manualAssign.mutate(
                              {
                                orderItemId: item.id,
                                stockUnitId,
                              },
                              {
                                onSuccess: () => {
                                  toast.success("Stok berhasil di-assign!");
                                },
                                onError: (err: unknown) =>
                                  toast.error("Gagal assign stok: " + extractApiError(err)),
                              },
                            );
                          }}
                          isPending={manualAssign.isPending}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
