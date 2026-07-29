"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardPanel,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconApi,
  IconLock,
  IconCheck,
  IconCopy,
  IconArrowLeft,
  IconKey,
  IconLoader,
} from "@tabler/icons-react";
import { useToast } from "@/lib/toast";
import { useAuthStore } from "@/stores/auth-store";
import type { ApiServiceDetail, ApiEndpoint, ApiPlan } from "@/features/api-directory/types";

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  PUT: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  PATCH: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
};

export function ApiServiceDetailPage({ slug }: { slug: string }) {
  const { data: service } = useQuery<ApiServiceDetail>({
    queryKey: queryKeys.apiDirectory.detail(slug),
    queryFn: async () => {
      const res = await fetch(`/api/v1/bff/api-services/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60_000,
  });

  if (!service) return null;
  return (
    <div className="min-h-svh bg-background px-6 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Back link */}
        <Link
          href="/api-directory"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft data-icon="inline-start" />
          Kembali ke Directory
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-xl border bg-muted">
                <IconApi />
              </div>
              <div>
                <h1 className="font-heading text-2xl">{service.name}</h1>
                <p className="text-muted-foreground text-sm">{service.shortDescription}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{service.version}</Badge>
              <Badge variant="default" className="capitalize">
                {service.status.toLowerCase()}
              </Badge>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 font-mono text-sm">
            <span className="text-muted-foreground">Base URL:</span>
            <span className="flex-1 truncate">{service.baseUrl}</span>
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigator.clipboard.writeText(service.baseUrl)}
              aria-label="Copy base URL"
            >
              <IconCopy />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="flex flex-col gap-4">
          <TabsList variant="line">
            <TabsTrigger value="overview">Ringkasan</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoint</TabsTrigger>
            <TabsTrigger value="pricing">Harga</TabsTrigger>
            <TabsTrigger value="docs">Dokumentasi</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab service={service} />
          </TabsContent>
          <TabsContent value="endpoints">
            <EndpointsTab endpoints={service.endpoints} />
          </TabsContent>
          <TabsContent value="pricing">
            <PricingTab plans={service.plans} slug={slug} />
          </TabsContent>
          <TabsContent value="docs">
            <DocsTab service={service} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function OverviewTab({ service }: { service: ApiServiceDetail }) {
  return (
    <div className="flex flex-col gap-6 pt-6">
      {service.description && (
        <p className="text-sm text-muted-foreground">{service.description}</p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardPanel>
            <p className="text-sm text-muted-foreground">Endpoint</p>
            <p className="text-2xl font-semibold mt-1">{service.endpoints.length}</p>
          </CardPanel>
        </Card>
        <Card>
          <CardPanel>
            <p className="text-sm text-muted-foreground">Paket</p>
            <p className="text-2xl font-semibold mt-1">{service.plans.length}</p>
          </CardPanel>
        </Card>
        <Card>
          <CardPanel>
            <p className="text-sm text-muted-foreground">Kategori</p>
            <p className="text-2xl font-semibold mt-1 capitalize">{service.category}</p>
          </CardPanel>
        </Card>
      </div>

      <div>
        <h3 className="font-medium mb-3">Endpoint</h3>
        <div className="flex flex-col gap-2">
          {service.endpoints.slice(0, 5).map((ep) => (
            <div
              key={ep.id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2"
            >
              <Badge variant="outline" className={`font-mono text-[10px] ${methodColors[ep.method] ?? ""}`}>
                {ep.method}
              </Badge>
              <span className="font-mono text-sm">{ep.path}</span>
              {ep.isPremium && <IconLock className="ml-auto text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EndpointsTab({ endpoints }: { endpoints: ApiEndpoint[] }) {
  return (
    <div className="flex flex-col gap-3 pt-6">
      {endpoints.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          Belum ada endpoint yang didokumentasikan
        </p>
      ) : (
        endpoints.map((ep) => (
          <Card key={ep.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`font-mono text-xs ${methodColors[ep.method] ?? ""}`}>
                  {ep.method}
                </Badge>
                <CardTitle className="font-mono text-sm font-normal">
                  {ep.path}
                </CardTitle>
                {ep.isPremium && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    <IconLock data-icon="inline-start" />
                    Premium
                  </Badge>
                )}
              </div>
            </CardHeader>
            {(ep.summary || ep.description) && (
              <CardPanel className="pt-0">
                <p className="text-sm text-muted-foreground">
                  {ep.summary ?? ep.description}
                </p>
              </CardPanel>
            )}
            {ep.responseExample != null && (
              <CardPanel className="pt-0">
                <details className="group">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    Contoh Response
                  </summary>
                  <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(ep.responseExample as object, null, 2)}
                  </pre>
                </details>
              </CardPanel>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

function PricingTab({ plans, slug }: { plans: ApiPlan[]; slug: string }) {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);
  const [apiKeyRevealed, setApiKeyRevealed] = useState<string | null>(null);

  const subscribeMutation = useMutation({
    mutationFn: async (planName: string) => {
      const res = await fetch(`/api/v1/bff/api-services/${slug}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Gagal subscribe");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.type === "PENDING_PAYMENT") {
        // Paid plan — redirect to subscription order page
        toast.success("Order berhasil dibuat. Silakan transfer dan upload bukti pembayaran.");
        router.push(`/api-keys?tab=orders`);
      } else if (data.apiKey?.key) {
        // Free plan — show API key
        setApiKeyRevealed(data.apiKey.key);
        toast.success("Berhasil subscribe! API key kamu sudah dibuat.");
      } else {
        toast.success("Berhasil subscribe! Menggunakan API key yang sudah ada.");
      }
      setSubscribingPlan(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setSubscribingPlan(null);
    },
  });

  const handleSubscribe = (plan: ApiPlan) => {
    if (!user) {
      router.push(`/auth/login?redirect=/api-directory/${slug}`);
      return;
    }
    setSubscribingPlan(plan.name);
    subscribeMutation.mutate(plan.name);
  };

  return (
    <div className="flex flex-col gap-6 pt-6">
      {/* API Key reveal dialog */}
      {apiKeyRevealed && (
        <Card className="border-emerald-500 bg-emerald-500/5">
          <CardPanel>
            <div className="flex items-center gap-2 mb-2">
              <IconKey className="size-5 text-emerald-600" />
              <p className="font-medium text-emerald-700 dark:text-emerald-400">API Key Baru — Simpan Sekarang!</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Key ini hanya ditampilkan sekali. Salin dan simpan di tempat aman.
            </p>
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 font-mono text-sm">
              <span className="flex-1 truncate select-all">{apiKeyRevealed}</span>
              <button
                className="text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(apiKeyRevealed);
                  toast.success("API key sudah di-copy!");
                }}
                aria-label="Copy API key"
              >
                <IconCopy className="size-4" />
              </button>
            </div>
          </CardPanel>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan, idx) => (
          <Card key={plan.id} className={idx === 1 ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <div className="mt-2">
                {plan.priceCents === 0 ? (
                  <span className="text-3xl font-bold">Gratis</span>
                ) : (
                  <div>
                    <span className="text-3xl font-bold">
                      Rp {plan.priceCents.toLocaleString("id-ID")}
                    </span>
                    <span className="text-muted-foreground text-sm">/bulan</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardPanel className="pt-0">
              <ul className="flex flex-col gap-2.5">
                <li className="flex items-center gap-2 text-sm">
                  <IconCheck data-icon="inline-start" className="text-emerald-500" />
                  {plan.requestsPerMinute} requests/menit
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <IconCheck data-icon="inline-start" className="text-emerald-500" />
                  {plan.requestsPerDay
                    ? `${plan.requestsPerDay.toLocaleString("id-ID")} requests/hari`
                    : "Unlimited requests/hari"}
                </li>
                {plan.features &&
                  (plan.features as string[]).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <IconCheck data-icon="inline-start" className="text-emerald-500" />
                      {feature}
                    </li>
                  ))}
              </ul>
              <Separator className="my-4" />
              <Button
                className="w-full"
                variant={idx === 0 ? "outline" : "default"}
                disabled={subscribingPlan === plan.name}
                onClick={() => handleSubscribe(plan)}
              >
                {subscribingPlan === plan.name ? (
                  <>
                    <IconLoader className="animate-spin" data-icon="inline-start" />
                    Memproses...
                  </>
                ) : plan.priceCents === 0 ? (
                  "Mulai Gratis"
                ) : (
                  "Berlangganan"
                )}
              </Button>
              {plan.priceCents > 0 && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Pembayaran manual — transfer lalu upload bukti
                </p>
              )}
            </CardPanel>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DocsTab({ service }: { service: ApiServiceDetail }) {
  // Tentukan URL docs-web berdasarkan slug service
  const docsUrl =
    service.slug === 'trading'
      ? 'https://docs.sandimf.dev/docs/api/trading'
      : `https://docs.sandimf.dev/docs/api/${service.slug}`;

  return (
    <div className="flex flex-col items-center gap-6 pt-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <svg
          className="size-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
      </div>
      <div>
        <h3 className="text-lg font-semibold">Dokumentasi Lengkap</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          Dokumentasi lengkap untuk API ini tersedia di Docs. Lihat endpoint, contoh kode, dan panduan autentikasi.
        </p>
      </div>
      <a
        href={docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Buka Dokumentasi
        <svg
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </a>
    </div>
  );
}
