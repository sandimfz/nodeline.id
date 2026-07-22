import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  PackagePlus,
  ClipboardList,
  Settings,
  RefreshCw,
  Eye,
  ImageIcon,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  useProduct,
  usePendingOrders,
  useStockUnits,
  useUpdateProduct,
  useRestockProduct,
  useManualRestock,
  useUploadProductImage,
} from "@/features/marketplace/hooks";
import { ProductForm } from "@/features/marketplace/components/ProductForm";
import { ADMIN_BASE } from "@/lib/config";
import { extractApiError } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, error } = useProduct(id ?? "");
  const { data: pendingOrders, isLoading: ordersLoading } = usePendingOrders(
    id ?? "",
  );
  const { data: stockUnits, isLoading: stockLoading } = useStockUnits(
    id ?? "",
  );
  const updateProduct = useUpdateProduct(id ?? "");
  const restockProduct = useRestockProduct(id ?? "");
  const manualRestock = useManualRestock(id ?? "");
  const uploadImage = useUploadProductImage(id ?? "");

  const [restockText, setRestockText] = useState("");
  const [manualContent, setManualContent] = useState("");
  const toast = useToast();

  const parsePaymentProof = useCallback(
    (order: { paymentNote: string | null }) => {
      const note = order.paymentNote ?? "";
      const match = note.match(/\[BUKTI BAYAR\]\s*(https?:\/\/[^\s]+)/);
      return {
        hasImage: !!match,
        firstUrl: match?.[1] ?? "",
      };
    },
    [],
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-semibold">Produk tidak ditemukan</p>
        <Link
          to={`${ADMIN_BASE}/dashboard/products`}
          className="mt-2 text-sm text-primary hover:underline"
        >
          Kembali ke daftar produk
        </Link>
      </div>
    );
  }

  const formatPrice = (cents: number) =>
    `Rp ${cents.toLocaleString("id-ID")}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to={`${ADMIN_BASE}/dashboard/products`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Kembali
        </Link>
        <div className="flex items-start gap-4">
          {/* Product Image */}
          <div className="shrink-0">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="size-20 rounded-xl border border-border object-cover md:size-28"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-xl border border-border bg-muted md:size-28">
                <ImageIcon className="size-8 text-muted-foreground/50" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {product.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  product.stockStatus === "AVAILABLE"
                    ? "default"
                    : "destructive"
                }
                className="text-[10px]"
              >
                {product.stockStatus === "AVAILABLE" ? "Tersedia" : "Habis"}
              </Badge>
              {!product.isActive && (
                <Badge variant="outline" className="text-[10px]">
                  Nonaktif
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatPrice(product.priceCents)} / {product.keysPerUnit} key
                per unit
              </span>
              {product.imageUrl && (
                <a
                  href={product.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ImageIcon className="size-3" />
                  Lihat gambar
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Harga</p>
              <p className="mt-0.5 font-medium">
                {formatPrice(product.priceCents)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Key per Unit</p>
              <p className="mt-0.5 font-medium">{product.keysPerUnit}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Garansi</p>
              <p className="mt-0.5 font-medium">
                {product.warrantyPeriodDays
                  ? `${product.warrantyPeriodDays} hari`
                  : "Tidak ada"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Maks Klaim</p>
              <p className="mt-0.5 font-medium">
                {product.maxWarrantyClaims ?? "Tidak dibatasi"}
              </p>
            </div>
          </div>
          {product.description && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground">Deskripsi</p>
                <p className="mt-1 text-sm">{product.description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tabs: Edit, Restock, Stok, Pending Orders */}
      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit" className="flex items-center gap-1.5">
            <Settings className="size-3.5" />
            Edit Produk
          </TabsTrigger>
          <TabsTrigger value="restock" className="flex items-center gap-1.5">
            <PackagePlus className="size-3.5" />
            Restock
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center gap-1.5">
            <Eye className="size-3.5" />
            Stok
            {stockUnits && stockUnits.length > 0 && (
              <Badge variant="outline" className="ml-1 text-[10px]">
                {stockUnits.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="flex items-center gap-1.5"
          >
            <ClipboardList className="size-3.5" />
            Pesanan Pending
            {pendingOrders && pendingOrders.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px]">
                {pendingOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Edit Tab */}
        <TabsContent value="edit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Edit Produk</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductForm
                key={product.id}
                productId={product.id}
                initialData={{
                  name: product.name,
                  description: product.description ?? undefined,
                  priceCents: product.priceCents,
                  keysPerUnit: product.keysPerUnit,
                  isActive: product.isActive,
                  warrantyPeriodDays:
                    product.warrantyPeriodDays ?? undefined,
                  maxWarrantyClaims: product.maxWarrantyClaims ?? undefined,
                  imageUrl: product.imageUrl ?? undefined,
                }}
                onSubmit={(data) =>
                  updateProduct.mutate(data, {
                    onSuccess: () => toast.success("Produk berhasil diperbarui"),
                    onError: (err: unknown) => {
                      toast.error(extractApiError(err));
                    },
                  })
                }
                isPending={updateProduct.isPending}
                uploadMutation={{
                  mutate: (file: File) => uploadImage.mutate(file),
                  isPending: uploadImage.isPending,
                  data: uploadImage.data,
                  reset: () => uploadImage.reset(),
                }}
              />

            </CardContent>
          </Card>
        </TabsContent>

        {/* Restock Tab */}
        <TabsContent value="restock">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Batch Restock */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Restock dari Teks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="restock-text">
                    Konten (satu baris per key/link)
                  </Label>
                  <Textarea
                    id="restock-text"
                    placeholder={`sk-abc123\nsk-def456\nsk-ghi789`}
                    rows={6}
                    value={restockText}
                    onChange={(e) => setRestockText(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Baris harus kelipatan {product.keysPerUnit} (keysPerUnit
                    produk ini). Setiap {product.keysPerUnit} baris = 1 unit.
                  </p>
                </div>

                <Button
                  onClick={() => {
                    restockProduct.mutate(
                      { content: restockText },
                      {
                        onSuccess: () => {
                          setRestockText("");
                          toast.success("Stok berhasil ditambahkan");
                        },
                        onError: (err: unknown) => {
                          toast.error(extractApiError(err));
                        },
                      },
                    );
                  }}
                  disabled={restockProduct.isPending || !restockText.trim()}
                  className="w-full"
                >
                  {restockProduct.isPending ? (
                    <>
                      <RefreshCw className="mr-1.5 size-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <PackagePlus className="mr-1.5 size-4" />
                      Restock
                    </>
                  )}
                </Button>

              </CardContent>
            </Card>

            {/* Manual Restock */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Tambah 1 Unit Manual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="manual-content">Isi konten</Label>
                  <Textarea
                    id="manual-content"
                    placeholder="https://example.com/invite/xyz"
                    rows={3}
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <Button
                  onClick={() => {
                    manualRestock.mutate(
                      { content: manualContent },
                      {
                        onSuccess: () => {
                          setManualContent("");
                          toast.success("1 unit stok berhasil ditambahkan");
                        },
                        onError: (err: unknown) => {
                          toast.error(extractApiError(err));
                        },
                      },
                    );
                  }}
                  disabled={
                    manualRestock.isPending || !manualContent.trim()
                  }
                  variant="outline"
                  className="w-full"
                >
                  {manualRestock.isPending ? (
                    <>
                      <RefreshCw className="mr-1.5 size-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Tambah Unit"
                  )}
                </Button>

              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stok Tab */}
        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Daftar Stok
                {stockUnits && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {stockUnits.filter((s) => s.status === "AVAILABLE").length}{" "}
                    tersedia / {stockUnits.length} total
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !stockUnits || stockUnits.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Belum ada stok untuk produk ini. Restock dulu!
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          #
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Konten
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Dibuat
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Terjual
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockUnits.map((unit, idx) => (
                        <tr
                          key={unit.id}
                          className="border-b border-border transition-colors hover:bg-muted/50"
                        >
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="max-w-xs truncate px-3 py-2.5 font-mono text-xs">
                            <code
                              className="block truncate rounded bg-muted px-1.5 py-0.5"
                              title={unit.content}
                            >
                              {unit.content}
                            </code>
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant={
                                unit.status === "AVAILABLE"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {unit.status === "AVAILABLE"
                                ? "Tersedia"
                                : "Terjual"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {new Date(unit.createdAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {unit.soldAt
                              ? new Date(unit.soldAt).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pesanan Pending</CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : pendingOrders?.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Tidak ada pesanan pending untuk produk ini
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Pembeli
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Status
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Qty
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Total
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            WhatsApp
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Bukti
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Tanggal
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingOrders?.map((order) => {
                          const noteInfo = parsePaymentProof(order);
                          return (
                            <tr
                              key={order.orderId}
                              className="border-b border-border transition-colors hover:bg-muted/50"
                            >
                              <td className="px-3 py-2.5">
                                <div>
                                  <p className="font-medium">{order.buyerName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {order.buyerEmail}
                                  </p>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <Badge
                                  variant={
                                    order.status ===
                                    "PENDING_PAYMENT_CONFIRMATION"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className="text-[10px]"
                                >
                                  {order.status ===
                                  "PENDING_PAYMENT_CONFIRMATION"
                                    ? "Menunggu Pembayaran"
                                    : "Dibayar"}
                                </Badge>
                              </td>
                              <td className="px-3 py-2.5">{order.quantity}</td>
                              <td className="px-3 py-2.5 font-mono text-xs">
                                Rp{" "}
                                {order.totalCents.toLocaleString("id-ID")}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-xs">
                                <Link
                                  to={`${ADMIN_BASE}/dashboard/orders/${order.orderId}`}
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  {order.whatsappNumber}
                                  <ExternalLink className="size-3" />
                                </Link>
                              </td>
                              <td className="px-3 py-2.5">
                                {noteInfo.hasImage ? (
                                  <a
                                    href={noteInfo.firstUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    <ImageIcon className="size-3" />
                                    Lihat
                                  </a>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {pendingOrders && pendingOrders.length > 0 && (
                    <div className="text-center">
                      <Link
                        to={`${ADMIN_BASE}/dashboard/orders`}
                        className="text-xs text-primary hover:underline"
                      >
                        Lihat semua pesanan →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
