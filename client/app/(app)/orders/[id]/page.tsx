"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  ImageIcon,
  ExternalLink,
  ImageUp,
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/lib/toast";
import {
  useOrderDetail,
  useOrderItemContent,
} from "@/features/marketplace/hooks";
import type { OrderStatus } from "@/features/marketplace/types";

/** Parse [BUKTI BAYAR] URL(s) from payment note */
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

/** Clean payment note: remove [BUKTI BAYAR] URL lines */
function cleanPaymentNote(note: string | null): string {
  if (!note) return "";
  return note.replace(/\[BUKTI BAYAR\]\s*(https?:\/\/[^\s]+)/g, "").trim();
}

function PaymentProofSection({ paymentNote }: { paymentNote: string | null }) {
  if (!paymentNote) return null;

  const images = parsePaymentImages(paymentNote);
  const cleanNote = cleanPaymentNote(paymentNote);

  if (images.length === 0 && !cleanNote) return null;

  return (
    <div className="border-t pt-3 space-y-3">
      <span className="text-muted-foreground">Catatan Pembayaran</span>

      <Accordion multiple className="rounded-lg border divide-y divide-border overflow-hidden">
        {images.map((url, idx) => (
          <AccordionItem key={idx} value={`image-${idx}`} className="border-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline group-aria-expanded/accordion-trigger:text-foreground">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <ImageUp className="size-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Bukti Bayar {idx + 1}</p>
                  <p className="text-xs text-muted-foreground">
                    Klik untuk lihat gambar penuh
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block overflow-hidden rounded-lg border border-border bg-muted/20 transition-shadow hover:shadow-md"
              >
                <Image
                  src={url}
                  alt={`Bukti bayar ${idx + 1}`}
                  width={800}
                  height={600}
                  className="h-auto w-full object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <div className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm font-medium opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                    <ExternalLink className="size-4" />
                    Buka di tab baru
                  </div>
                </div>
              </a>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Clean note text */}
      {cleanNote && (
        <p className="whitespace-pre-wrap rounded-lg bg-muted/30 p-3 text-xs">
          {cleanNote}
        </p>
      )}
    </div>
  );
}

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

const STATUS_INFO: Record<OrderStatus, { label: string; desc: string; color: string }> = {
  PENDING_PAYMENT_CONFIRMATION: {
    label: "Menunggu Pembayaran",
    desc: "Pembeli sudah checkout tapi pembayaran belum dikonfirmasi admin",
    color: "text-destructive",
  },
  PAID_PENDING_FULFILLMENT: {
    label: "Dibayar — Menunggu Stok",
    desc: "Pembayaran sudah dikonfirmasi, menunggu stok tersedia",
    color: "text-amber-500",
  },
  FULFILLED: {
    label: "Selesai",
    desc: "Semua item sudah terkirim. Konten bisa diakses.",
    color: "text-emerald-500",
  },
  REFUND_REQUESTED: { label: "Refund Diajukan", desc: "", color: "text-muted-foreground" },
  REFUNDED: { label: "Dikembalikan", desc: "", color: "text-muted-foreground" },
  CANCELLED: { label: "Dibatalkan", desc: "", color: "text-muted-foreground" },
};

export default function OrderDetailPage() {
  const params = useParams();
  const toast = useToast();
  const orderId = params.id as string;
  const { data: order, isLoading, isError } = useOrderDetail(orderId);

  if (isLoading) {
    return (
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Skeleton className="h-6 w-48" />
          <div className="mt-6 space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Package className="mb-4 size-12 text-muted-foreground/50" />
        <p className="text-lg font-medium">Pesanan tidak ditemukan</p>
        <Link href="/orders">
          <Button variant="outline" className="mt-4">
            Kembali
          </Button>
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_INFO[order.status as OrderStatus] ?? {
    label: order.status,
    desc: "",
    color: "text-muted-foreground",
  };

  return (
    <div className="w-full px-4 md:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
      <Link
        href="/orders"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Kembali ke Pesanan
      </Link>

      <div className="mb-6">
        <h1 className="font-heading text-xl font-semibold">
          Pesanan #{order.id.slice(0, 8)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(order.createdAt)}
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-4">
        <CardContent className="flex items-center gap-3 p-4">
          <div className={`${statusInfo.color}`}>
            {order.status === "FULFILLED" ? (
              <CheckCircle2 className="size-6" />
            ) : order.status === "PENDING_PAYMENT_CONFIRMATION" ? (
              <Clock className="size-6" />
            ) : (
              <AlertTriangle className="size-6" />
            )}
          </div>
          <div>
            <p className={`font-semibold ${statusInfo.color}`}>
              {statusInfo.label}
            </p>
            {statusInfo.desc && (
              <p className="text-xs text-muted-foreground">
                {statusInfo.desc}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Info */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Informasi Pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-heading font-semibold">
              {formatPrice(order.totalCents)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">WhatsApp</span>
            <span>{order.whatsappNumber}</span>
          </div>
          <PaymentProofSection paymentNote={order.paymentNote} />
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item Pesanan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((item) => (
            <OrderItemCard
              key={item.id}
              item={item}
              orderId={order.id}
              orderStatus={order.status as OrderStatus}
            />
          ))}
        </CardContent>
      </Card>
      </div>{/* end max-w-7xl */}
    </div>
  );
}

function OrderItemCard({
  item,
  orderId,
  orderStatus,
}: {
  item: {
    id: string;
    productId: string;
    productName: string;
    productImage: string | null;
    quantity: number;
    priceCents: number;
    hasContent: boolean;
  };
  orderId: string;
  orderStatus: OrderStatus;
}) {
  const toast = useToast();
  const [showContent, setShowContent] = useState(false);
  const { data: contentData, isLoading: contentLoading, error: contentError } = useOrderItemContent(
    orderId,
    item.id,
    showContent && item.hasContent,
  );

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Konten disalin!");
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        {/* Product image */}
        <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
          {item.productImage ? (
            <img
              src={item.productImage}
              alt={item.productName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="size-5 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <Link
            href={`/marketplace/${item.productId}`}
            className="font-medium text-sm hover:underline"
          >
            {item.productName}
          </Link>
          <p className="text-xs text-muted-foreground">
            {formatPrice(item.priceCents)} × {item.quantity}
          </p>
          <p className="font-heading text-sm font-semibold">
            {formatPrice(item.priceCents * item.quantity)}
          </p>
        </div>

        {/* Status badge */}
        {item.hasContent ? (
          <Badge
            variant="default"
            className="shrink-0 font-mono text-[10px] uppercase tracking-wider"
          >
            Terkirim
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="shrink-0 font-mono text-[10px] uppercase tracking-wider"
          >
            Belum
          </Badge>
        )}
      </div>

      {/* Content viewer (only for fulfilled items) */}
      {item.hasContent && (
        <div className="mt-3 border-t pt-3">
          {showContent ? (
            <div className="space-y-2">
              {contentLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="size-3 animate-spin" />
                  Memuat konten...
                </div>
              ) : contentError ? (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertTriangle className="size-3" />
                  Gagal memuat konten
                </div>
              ) : contentData?.content ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-border bg-muted/50 p-3">
                    <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">
                      {contentData.content}
                    </pre>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(contentData.content)}
                    >
                      <Copy className="mr-1.5 size-3" />
                      Salin
                    </Button>
                  </div>
                </div>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowContent(false)}
                className="text-xs"
              >
                <EyeOff className="mr-1.5 size-3" />
                Sembunyikan
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowContent(true)}
              className="w-full"
            >
              <Eye className="mr-1.5 size-3" />
              Lihat Konten
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
