"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBagIcon, ImageIcon, Tags, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Product } from "@/features/marketplace/types";
import { useAuthStore } from "@/stores/auth-store";

function formatPrice(cents: number): string {
  return `Rp ${cents.toLocaleString("id-ID")}`;
}

function huesFromId(id: string): { hueA: string; hueB: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 40 + Math.abs(hash * 7 % 80)) % 360;
  return {
    hueA: `hsl(${h1}, 70%, 75%)`,
    hueB: `hsl(${h2}, 65%, 70%)`,
  };
}

export function ProductDetailPage({ product }: { product: Product }) {
  const isLoggedIn = !!useAuthStore((s) => s.user);
  const isAvailable = product.stockStatus === "AVAILABLE" && product.isActive;
  const { hueA, hueB } = huesFromId(product.id);

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Back link */}
        <Link
          href="/marketplace"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Marketplace
        </Link>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Image */}
          <div
            className="relative aspect-square w-full overflow-hidden rounded-xl"
            style={
              product.imageUrl
                ? undefined
                : {
                    background: `radial-gradient(120% 100% at 30% 20%, ${hueA}, transparent 60%), radial-gradient(120% 100% at 80% 80%, ${hueB}, transparent 60%), color-mix(in srgb, var(--muted) 80%, transparent)`,
                  }
            }
          >
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={800}
                height={800}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="size-16 text-foreground/20" />
              </div>
            )}

            <div className="absolute top-4 left-4 flex gap-2">
              {isAvailable ? (
                <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
                  Tersedia
                </Badge>
              ) : (
                <Badge variant="destructive" className="font-mono text-[10px] uppercase tracking-wider">
                  Habis
                </Badge>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-6">
            {product.categoryName && (
              <Badge
                variant="outline"
                className="inline-flex w-fit items-center gap-1 font-mono text-[10px] uppercase tracking-wider"
              >
                <Tags className="size-2.5" />
                {product.categoryName}
              </Badge>
            )}

            <div>
              <h1 className="font-heading text-2xl font-semibold leading-tight">
                {product.name}
              </h1>
              {product.description && (
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            <div className="font-heading text-3xl font-semibold">
              {formatPrice(product.priceCents)}
            </div>

            {/* Key features */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Key per unit: {product.keysPerUnit}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Pengiriman otomatis setelah konfirmasi admin</span>
              </div>
            </div>

            {/* CTA */}
            {isLoggedIn ? (
              <Link href={`/checkout?product=${product.id}`}>
                <Button size="lg" className="w-full" disabled={!isAvailable}>
                  <ShoppingBagIcon className="mr-2 size-4" />
                  {isAvailable ? "Beli Sekarang" : "Stok Habis"}
                </Button>
              </Link>
            ) : (
              <Link href={`/auth/login?redirect=/marketplace/${product.id}`}>
                <Button size="lg" className="w-full">
                  Masuk untuk Membeli
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Info card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">Informasi Produk</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Kategori</span>
              <p className="font-medium">{product.categoryName ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status Stok</span>
              <p className="font-medium">
                {isAvailable ? "Tersedia" : "Stok Habis"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Key per Unit</span>
              <p className="font-medium">{product.keysPerUnit}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Harga</span>
              <p className="font-medium">{formatPrice(product.priceCents)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
