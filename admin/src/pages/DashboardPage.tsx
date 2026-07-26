import { Package, ShoppingCart, Users, AlertTriangle, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useProducts } from "@/features/marketplace/hooks";
import { useAllOrders } from "@/features/marketplace/hooks";
import { useUsers } from "@/features/auth/hooks";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: products } = useProducts();
  const { data: orders } = useAllOrders();
  const { data: allUsers } = useUsers();

  const totalProducts = products?.length ?? 0;
  const activeProducts = products?.filter((p) => p.isActive).length ?? 0;
  const outOfStock = products?.filter((p) => p.stockStatus === "OUT_OF_STOCK").length ?? 0;

  const pendingOrders = orders?.filter((o) => o.status === "PENDING_PAYMENT_CONFIRMATION").length ?? 0;
  const paidOrders = orders?.filter((o) => o.status === "PAID_PENDING_FULFILLMENT").length ?? 0;
  const fulfilledOrders = orders?.filter((o) => o.status === "FULFILLED").length ?? 0;

  const totalRevenue = orders?.reduce((sum, o) => sum + o.totalCents, 0) ?? 0;
  const totalUsers = allUsers?.length ?? 0;
  const adminUsers = allUsers?.filter((u) => u.role === "god").length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Selamat datang, {user?.name ?? "Admin"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Panel administrasi Nodeline Marketplace.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Produk</p>
            <Package className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-semibold">{totalProducts}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeProducts} aktif · {outOfStock} stok habis
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Pesanan</p>
            <ShoppingCart className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-semibold">{fulfilledOrders}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pendingOrders} pending · {paidOrders} dibayar
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Pengguna</p>
            <Users className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-semibold">{totalUsers}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {adminUsers} admin
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Revenue</p>
            <TrendingUp className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-semibold">
            Rp {(totalRevenue / 1000).toFixed(0)}k
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Dari {fulfilledOrders} pesanan selesai
          </p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {outOfStock > 0 && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>
            {outOfStock} produk kehabisan stok
          </AlertTitle>
          <AlertDescription>
            Segera restock produk yang stoknya habis agar tidak kehilangan penjualan.
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium">Pesanan Perlu Konfirmasi</h3>
          {pendingOrders > 0 ? (
            <p className="mt-2 text-3xl font-semibold text-destructive">{pendingOrders}</p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Semua pesanan sudah dikonfirmasi</p>
          )}
          {pendingOrders > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Segera konfirmasi pembayaran dari halaman Pesanan
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium">Pesanan Dibayar — Nunggu Stok</h3>
          {paidOrders > 0 ? (
            <>
              <p className="mt-2 text-3xl font-semibold text-destructive">{paidOrders}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Restock produk terkait untuk auto-fulfill pesanan ini
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Tidak ada pesanan yang menunggu stok</p>
          )}
        </div>
      </div>
    </div>
  );
}
