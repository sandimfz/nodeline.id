"use client";

import { useAuthStore } from "@/stores/auth-store";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Selamat datang, {user?.name ?? "User"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Ini adalah dashboard Nodeline kamu.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Pesanan Aktif</p>
          <p className="mt-2 text-3xl font-semibold">0</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Total Produk</p>
          <p className="mt-2 text-3xl font-semibold">0</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Saldo</p>
          <p className="mt-2 text-3xl font-semibold">Rp 0</p>
        </div>
      </div>
    </div>
  );
}
