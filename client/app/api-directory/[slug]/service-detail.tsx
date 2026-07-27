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
  // Build example paths from actual endpoints if available
  const priceEndpoint = service.endpoints.find(
    (ep) => ep.method === "GET" && ep.path.includes("/price/"),
  );
  const examplePath = priceEndpoint?.path ?? "/price/FOREXCOM:XAUUSD";
  const exampleSymbol = "FOREXCOM:XAUUSD";

  const curlExample = `# Harga real-time
curl -X GET "${service.baseUrl}${examplePath.replace(":symbol", exampleSymbol)}" \\
  -H "X-API-Key: nl_your_api_key_here"

# Candle OHLC (interval: 1m, 5m, 15m, 30m, 1h, 4h, 1d)
curl -X GET "${service.baseUrl}/candles/${exampleSymbol}?interval=5m&limit=50" \\
  -H "X-API-Key: nl_your_api_key_here"

# Indikator teknikal
curl -X GET "${service.baseUrl}/indicators/${exampleSymbol}?timeframe=15" \\
  -H "X-API-Key: nl_your_api_key_here"

# SSE realtime stream
curl -N "${service.baseUrl}${examplePath.replace(":symbol", exampleSymbol)}/stream" \\
  -H "X-API-Key: nl_your_api_key_here"`;

  const jsExample = `// Harga real-time
const response = await fetch("${service.baseUrl}/price/${exampleSymbol}", {
  headers: { "X-API-Key": "nl_your_api_key_here" }
});
const data = await response.json();
console.log(data.price, data.change, data.changePercent);

// SSE stream (server-side, jaga API key tetap rahasia)
const stream = await fetch("${service.baseUrl}/price/${exampleSymbol}/stream", {
  headers: { "X-API-Key": "nl_your_api_key_here" }
});
const reader = stream.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const lines = decoder.decode(value).split("\\n")
    .filter(l => l.startsWith("data: "));
  for (const line of lines) {
    const tick = JSON.parse(line.slice(6));
    console.log("Price:", tick.price);
  }
}`;

  const pythonExample = `import requests

API_KEY = "nl_your_api_key_here"
BASE = "${service.baseUrl}"
headers = {"X-API-Key": API_KEY}

# Harga real-time
resp = requests.get(f"{BASE}/price/${exampleSymbol}", headers=headers)
data = resp.json()
print(f"Harga: {data['price']} | Change: {data['change']} ({data['changePercent']}%)")

# Candle history
resp = requests.get(
    f"{BASE}/candles/${exampleSymbol}",
    headers=headers,
    params={"interval": "5m", "limit": 50}
)
candles = resp.json()["candles"]
for c in candles[-3:]:
    print(f"  O:{c['open']} H:{c['high']} L:{c['low']} C:{c['close']}")

# Indikator teknikal
resp = requests.get(
    f"{BASE}/indicators/${exampleSymbol}",
    headers=headers,
    params={"timeframe": 15}
)
indicators = resp.json()["indicators"]
print(f"RSI: {indicators['rsi']} | EMA20: {indicators['ema20']}")`;

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <h3 className="font-medium mb-3">Autentikasi</h3>
        <p className="text-sm text-muted-foreground">
          Semua request ke API ini memerlukan API key di header{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">X-API-Key</code>{" "}
          atau{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Authorization: Bearer &lt;key&gt;</code>.
          Dapatkan API key gratis dengan klik &quot;Mulai Gratis&quot; di tab Harga.
        </p>
      </div>

      <Separator />

      <div>
        <h3 className="font-medium mb-3">Symbol yang Didukung</h3>
        <div className="grid gap-2 sm:grid-cols-3 text-sm">
          <div>
            <p className="font-medium text-xs text-muted-foreground mb-1">Forex</p>
            <ul className="space-y-0.5 font-mono text-xs">
              <li>FOREXCOM:XAUUSD</li>
              <li>FOREXCOM:XAGUSD</li>
              <li>FOREXCOM:EURUSD</li>
              <li>FOREXCOM:GBPUSD</li>
              <li>FOREXCOM:USDJPY</li>
              <li>FOREXCOM:USDCAD</li>
              <li>FOREXCOM:USDCHF</li>
              <li>FOREXCOM:AUDUSD</li>
              <li>FOREXCOM:NZDUSD</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-xs text-muted-foreground mb-1">Saham</p>
            <ul className="space-y-0.5 font-mono text-xs">
              <li>NASDAQ:AAPL</li>
              <li>NASDAQ:GOOGL</li>
              <li>NASDAQ:MSFT</li>
              <li>NASDAQ:TSLA</li>
              <li>NASDAQ:AMZN</li>
              <li>NASDAQ:META</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-xs text-muted-foreground mb-1">Crypto</p>
            <ul className="space-y-0.5 font-mono text-xs">
              <li>CRYPTOCAP:BTC</li>
              <li>CRYPTOCAP:ETH</li>
            </ul>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-medium mb-3">Contoh Kode</h3>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">cURL</p>
            <pre className="overflow-auto rounded-lg bg-muted p-4 text-xs font-mono">{curlExample}</pre>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">JavaScript / TypeScript</p>
            <pre className="overflow-auto rounded-lg bg-muted p-4 text-xs font-mono">{jsExample}</pre>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Python</p>
            <pre className="overflow-auto rounded-lg bg-muted p-4 text-xs font-mono">{pythonExample}</pre>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-medium mb-3">Kode Error</h3>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Kode</th>
                <th className="px-4 py-2 text-left font-medium">Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="px-4 py-2 font-mono">200</td><td className="px-4 py-2">Sukses</td></tr>
              <tr className="border-b"><td className="px-4 py-2 font-mono">401</td><td className="px-4 py-2">API key tidak ada atau tidak valid</td></tr>
              <tr className="border-b"><td className="px-4 py-2 font-mono">403</td><td className="px-4 py-2">Tidak punya akses ke symbol ini (perlu upgrade paket)</td></tr>
              <tr className="border-b"><td className="px-4 py-2 font-mono">404</td><td className="px-4 py-2">Symbol tidak didukung atau data belum tersedia</td></tr>
              <tr className="border-b"><td className="px-4 py-2 font-mono">429</td><td className="px-4 py-2">Batas request terlampaui (per-menit atau per-hari)</td></tr>
              <tr className="border-b"><td className="px-4 py-2 font-mono">503</td><td className="px-4 py-2">API dinonaktifkan atau dalam pemeliharaan</td></tr>
              <tr><td className="px-4 py-2 font-mono">500</td><td className="px-4 py-2">Kesalahan server internal</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
