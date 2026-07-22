import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, AlertCircle, Package, ImageIcon } from "lucide-react";
import { useToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts, useCreateProduct, useDeleteProduct } from "@/features/marketplace/hooks";
import { ProductForm } from "@/features/marketplace/components/ProductForm";
import { ADMIN_BASE } from "@/lib/config";
import { extractApiError } from "@/lib/api-client";

export function ProductsPage() {
  const { data: products, isLoading, error } = useProducts();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const toast = useToast();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Produk</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="mb-3 size-10 text-destructive" />
        <h2 className="text-lg font-semibold">Gagal memuat produk</h2>
        <p className="mt-1 text-sm text-muted-foreground">
      Terjadi kesalahan saat mengambil data produk.
    </p>
      </div>
    );
  }

  const stockCount = products?.filter((p) => p.stockStatus === "AVAILABLE").length ?? 0;
  const lowStockCount =
    products?.filter(
      (p) => p.stockStatus === "OUT_OF_STOCK",
    ).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produk</h1>
          <p className="text-sm text-muted-foreground">
            Kelola produk marketplace
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap h-9 gap-1.5 px-2.5 transition-all outline-none select-none hover:bg-primary/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50">
            <Plus className="mr-1.5 size-4" />
            Tambah Produk
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Tambah Produk Baru</DialogTitle>
            </DialogHeader>
            <ProductForm
              onSubmit={(data) =>
                createProduct.mutate(data, {
                  onSuccess: () => {
                    setCreateOpen(false);
                    toast.success("Produk berhasil ditambahkan");
                  },
                  onError: (err: unknown) => {
                    toast.error(extractApiError(err));
                  },
                })
              }
              isPending={createProduct.isPending}
            />

          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{products?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tersedia</CardTitle>
            <Badge variant="outline" className="text-xs">
              Stok OK
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
              {stockCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Habis</CardTitle>
            <Badge variant="outline" className="text-xs text-destructive">
              Stok Habis
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-destructive">
              {lowStockCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Gambar
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Nama
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Harga
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Key/Unit
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {products?.length === 0 ? (
                <tr>                    <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Belum ada produk. Klik "Tambah Produk" untuk memulai.
                  </td>
                </tr>
              ) : (
                products?.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-border transition-colors hover:bg-muted/50"
                  >
                    <td className="px-4 py-3">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="size-10 rounded-lg border border-border object-cover"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted">
                          <ImageIcon className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`${ADMIN_BASE}/dashboard/products/${product.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {product.name}
                      </Link>
                      {product.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {product.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      Rp {product.priceCents.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3">{product.keysPerUnit}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            product.stockStatus === "AVAILABLE"
                              ? "default"
                              : "destructive"
                          }
                          className="text-[10px]"
                        >
                          {product.stockStatus === "AVAILABLE"
                            ? "Tersedia"
                            : "Habis"}
                        </Badge>
                        {!product.isActive && (
                          <Badge variant="outline" className="text-[10px]">
                            Nonaktif
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`${ADMIN_BASE}/dashboard/products/${product.id}`}
                        >
                          <Button variant="ghost" size="icon" className="size-8">
                            <Pencil className="size-3.5" />
                          </Button>
                        </Link>
                        <AlertDialog
                          open={deleteId === product.id}
                          onOpenChange={(open) =>
                            setDeleteId(open ? product.id : null)
                          }
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(product.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Hapus produk?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Produk "{product.name}" akan dihapus
                                permanen beserta stoknya. Tindakan ini tidak
                                bisa dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                onClick={() => setDeleteId(null)}
                              >
                                Batal
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => {
                                  deleteProduct.mutate(product.id);
                                  setDeleteId(null);
                                }}
                              >
                                {deleteProduct.isPending
                                  ? "Menghapus..."
                                  : "Hapus"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
