"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBagIcon, ImageIcon, Package, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Product } from "@/features/marketplace/types";

/**
 * Generate deterministic hue colours from a string (product id).
 */
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

function formatPrice(cents: number): string {
  return `Rp ${cents.toLocaleString("id-ID")}`;
}

async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/v1/bff/products");
  if (!res.ok) return [];
  const data = await res.json();
  return data.products ?? data;
}

export function CardProductShowcasePage() {
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: queryKeys.marketplace.products.list(),
    queryFn: fetchProducts,
    staleTime: 60_000,
  });
  return (
    <div className="min-h-svh bg-background px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <h1 className="font-heading text-xl">Marketplace</h1>
          <p className="text-muted-foreground text-sm">
            {products.length > 0
              ? `${products.length} produk tersedia`
              : "Belum ada produk"}
          </p>
        </header>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package className="mb-4 size-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              Belum ada produk tersedia
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Silakan kembali lagi nanti
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const { hueA, hueB } = huesFromId(product.id);
  const isAvailable = product.stockStatus === "AVAILABLE" && product.isActive;

  /** Prefetch detail on hover so navigation feels instant */
  const prefetchDetail = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.marketplace.products.detail(product.id),
      queryFn: async () => {
        const res = await fetch(`/api/v1/bff/products/${product.id}`);
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      },
      staleTime: 60_000,
    });
  };

  return (
    <Link
      href={`/marketplace/${product.id}`}
      className="group block"
      onMouseEnter={prefetchDetail}
      onFocus={prefetchDetail}
    >
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      {/* Image / Gradient area */}
      <div
        className="relative aspect-square w-full overflow-hidden"
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
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="size-12 text-foreground/20" />
          </div>
        )}

        {/* Stock status badge */}
        {isAvailable ? (
          <Badge
            variant="secondary"
            className="absolute top-3 left-3 font-mono text-[10px] uppercase tracking-wider"
          >
            Tersedia
          </Badge>
        ) : (
          <Badge
            variant="destructive"
            className="absolute top-3 left-3 font-mono text-[10px] uppercase tracking-wider"
          >
            Habis
          </Badge>
        )}

        {/* Stock count badge */}
        {isAvailable && (
          <Badge
            variant="secondary"
            className="absolute top-3 right-3 font-mono text-[10px] tracking-wider"
          >
            Stok: {product.stockCount}
          </Badge>
        )}


      </div>

      <CardHeader>
        {product.categoryName && (
          <div className="mb-1.5 flex items-center gap-1">
            <Badge
              variant="secondary"
              className="inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[10px] font-normal uppercase tracking-wider"
            >
              <Tags className="size-2.5" />
              {product.categoryName}
            </Badge>
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-heading text-base leading-tight">
            {product.name}
          </CardTitle>
        </div>
        {product.description && (
          <p className="line-clamp-2 text-muted-foreground text-sm">
            {product.description}
          </p>
        )}
      </CardHeader>

      <CardPanel className="pt-0">
        <div className="font-heading font-semibold text-lg">
          {formatPrice(product.priceCents)}
        </div>
      </CardPanel>

      <CardFooter className="border-t">
        <Button className="w-full" disabled={!isAvailable}>
          <ShoppingBagIcon />
          {isAvailable ? "Beli Sekarang" : "Stok Habis"}
        </Button>
      </CardFooter>
    </Card>
    </Link>
  );
}
