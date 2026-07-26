"use client";

import { type FormEvent, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingBagIcon,
  ArrowLeft,
  AlertCircle,
  QrCode,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  FileUpload,
  type FileUploadItem,
} from "@/components/motion/file-upload";
import { useToast } from "@/lib/toast";
import {
  useProduct,
  useCheckout,
  useUploadPaymentProof,
  usePaymentMethods,
} from "@/features/marketplace/hooks";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuthStore } from "@/stores/auth-store";

function formatPrice(cents: number): string {
  return `Rp ${cents.toLocaleString("id-ID")}`;
}

function PaymentMethodsSection() {
  const { data: methods, isLoading } = usePaymentMethods();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metode Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!methods || methods.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Metode Pembayaran</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="mb-3 text-xs text-muted-foreground">
          Pilih dan transfer ke salah satu metode di bawah:
        </p>
        <Accordion className="border rounded-lg divide-y divide-border">
          {methods.map((method) => (
            <AccordionItem key={method.id} value={method.id} className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline group-aria-expanded/accordion-trigger:text-foreground">
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    {method.type === "qris" ? (
                      <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
                        <QrCode className="size-5 text-emerald-600" />
                      </div>
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <Banknote className="size-5 text-blue-600" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium">{method.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {method.type === "qris" ? "QRIS" : "Transfer Bank"}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {method.type === "qris" ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="relative overflow-hidden rounded-xl border border-border bg-white p-4 shadow-sm">
                      <img
                        src={method.imageUrl}
                        alt={method.name}
                        className="mx-auto size-56 object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "https://placehold.co/400x400?text=QRIS";
                        }}
                      />
                    </div>
                    <p className="text-center text-xs text-muted-foreground">
                      Scan QRIS di atas menggunakan aplikasi pembayaran Anda
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 py-2">
                    <div className="overflow-hidden rounded-lg border border-border">
                      <img
                        src={method.imageUrl}
                        alt={method.name}
                        className="h-32 w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Detail Rekening
                      </p>
                      <p className="mt-1 font-medium">{method.accountName || method.name}</p>
                      {method.accountNumber && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <code className="rounded bg-background px-2 py-1 font-mono text-sm font-semibold tracking-wider">
                            {method.accountNumber}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

export function CheckoutForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const productId = searchParams.get("product");
  const quantity = parseInt(searchParams.get("qty") ?? "1", 10);

  const { data: product, isLoading } = useProduct(productId ?? "");
  const checkout = useCheckout();
  const upload = useUploadPaymentProof();

  const [whatsapp, setWhatsapp] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadItems, setUploadItems] = useState<FileUploadItem[]>([]);
  const uploadRef = useRef<{ file: File; id: string } | null>(null);

  // Redirect if no product selected
  useEffect(() => {
    if (!productId) {
      router.push("/marketplace");
    }
  }, [productId, router]);

  const isAvailable = product?.stockStatus === "AVAILABLE" && product?.isActive;
  const totalCents = product ? product.priceCents * quantity : 0;

  const handleFilesAdded = useCallback(
    (added: FileUploadItem[], files: File[]) => {
      const file = files[0];
      const item = added[0];
      if (!file || !item) return;

      uploadRef.current = { file, id: item.id };

      upload.mutate(
        { file },
        {
          onSuccess: (res) => {
            setUploadedUrl(res.url);
            setUploadItems((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? { ...i, progress: 100, status: "success" as const }
                  : i,
              ),
            );
            toast.success("Bukti bayar berhasil diupload");
          },
          onError: (err: unknown) => {
            const msg =
              typeof (err as Record<string, unknown>)?.message === "string"
                ? ((err as Record<string, unknown>).message as string)
                : "Gagal upload bukti bayar";
            setUploadItems((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? { ...i, status: "error" as const, error: msg }
                  : i,
              ),
            );
            toast.error(msg);
          },
        },
      );
    },
    [upload, toast],
  );

  const handleRetry = useCallback(
    (item: FileUploadItem) => {
      if (!uploadRef.current || uploadRef.current.id !== item.id) return;

      setUploadItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: "uploading" as const, progress: 0, error: undefined }
            : i,
        ),
      );

      upload.mutate(
        { file: uploadRef.current.file },
        {
          onSuccess: (res) => {
            setUploadedUrl(res.url);
            setUploadItems((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? { ...i, progress: 100, status: "success" as const }
                  : i,
              ),
            );
            toast.success("Bukti bayar berhasil diupload");
          },
          onError: (err: unknown) => {
            const msg =
              typeof (err as Record<string, unknown>)?.message === "string"
                ? ((err as Record<string, unknown>).message as string)
                : "Gagal upload bukti bayar";
            setUploadItems((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? { ...i, status: "error" as const, error: msg }
                  : i,
              ),
            );
          },
        },
      );
    },
    [upload, toast],
  );

  const handleRemove = useCallback(
    (item: FileUploadItem) => {
      if (uploadRef.current?.id === item.id) {
        uploadRef.current = null;
        setUploadedUrl(null);
      }
    },
    [],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!productId || !product) return;

    checkout.mutate(
      {
        whatsappNumber: whatsapp,
        paymentNote: uploadedUrl
          ? `[BUKTI BAYAR] ${uploadedUrl}${paymentNote ? `\n${paymentNote}` : ""}`
          : paymentNote || undefined,
        items: [{ productId, quantity }],
      },
      {
        onSuccess: () => {
          toast.success("Pesanan berhasil dibuat!");
        },
        onError: (err: unknown) => {
          const msg =
            typeof (err as Record<string, unknown>)?.message === "string"
              ? ((err as Record<string, unknown>).message as string)
              : "Gagal membuat pesanan";
          toast.error(msg);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="mb-4 size-12 text-muted-foreground/50" />
        <p className="text-lg font-medium">Produk tidak ditemukan</p>
        <Link href="/marketplace">
          <Button variant="outline" className="mt-4">
            Kembali
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href={`/marketplace/${product.id}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Kembali
        </Link>

        <h1 className="font-heading text-xl font-semibold">Checkout</h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
          {/* Product Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ringkasan Pesanan</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(product.priceCents)} × {quantity}
                  </p>
                </div>
                <p className="font-medium">{formatPrice(totalCents)}</p>
              </div>
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total</span>
                  <span className="font-heading text-xl font-semibold">
                    {formatPrice(totalCents)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Buyer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi Pembeli</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {user && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="whatsapp">Nomor WhatsApp *</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="628123456789"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className={checkout.isPending ? "opacity-50" : ""}
                />
                <p className="text-[10px] text-muted-foreground">
                  Format: 628xxx (tanpa + atau spasi)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <PaymentMethodsSection />

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload Bukti Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FileUpload
                value={uploadItems}
                onValueChange={setUploadItems}
                onFilesAdded={handleFilesAdded}
                onRetry={handleRetry}
                onRemove={handleRemove}
                variant="centered"
                maxFiles={1}
                multiple={false}
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                title="Drop bukti bayar di sini"
                description="JPEG, PNG, WebP, atau HEIC (max 10 MB)"
                browseLabel="Pilih File"
                disabled={checkout.isPending}
              />

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note">Catatan Pembayaran</Label>
                <Textarea
                  id="note"
                  placeholder="Transfer via BCA a.n. John Doe"
                  rows={2}
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  disabled={checkout.isPending}
                />
              </div>
            </CardContent>
          </Card>

          {!isAvailable && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              Produk ini sedang tidak tersedia. Anda tetap bisa checkout dan akan
              mendapatkan konten setelah admin restock.
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={checkout.isPending || !whatsapp.trim()}
          >
            {checkout.isPending ? (
              <>
                <Spinner data-icon="inline-start" />
                Memproses...
              </>
            ) : (
              <>
                <ShoppingBagIcon data-icon="inline-start" />
                Buat Pesanan
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
