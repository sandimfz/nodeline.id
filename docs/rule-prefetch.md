# TanStack Query Prefetch — Aturan & Rules

Dokumen ini rules umum yang berlaku ke **semua** fitur di project (auth/profile, marketplace, chat, api-directory, dst) — bukan checklist per-fitur, tapi aturan supaya prefetch-nya konsisten dan benar-benar bikin cepat, bukan cuma "ada tapi percuma".

---

## 1. Prinsip Dasar

> **Prefetch = pindahkan network round-trip dari client ke server, sedini mungkin, sebelum HTML dikirim ke browser.**

Kalau data di-fetch di client (`useQuery` tanpa prefetch), urutannya: browser download JS → hydrate → React jalan → `useQuery` baru mulai fetch → loading spinner → data muncul. Itu minimal 2 round-trip berurutan (render kosong dulu, baru fetch).

Dengan prefetch yang benar: Server Component fetch data **sambil** menyiapkan HTML → HTML yang dikirim ke browser **sudah** berisi data asli, `useQuery` di client cuma "mengambil alih" cache yang sudah ada (tidak fetch ulang). Ini bedanya kenceng vs kelihatan kenceng doang.

**Tanda-tanda prefetch KAMU SALAH** (sering kejadian): buka Network tab, request yang sama muncul **2 kali** — sekali dari server (SSR), sekali lagi dari browser begitu halaman hydrate. Kalau ini terjadi, `queryKey` di server dan di client tidak identik, atau `staleTime` terlalu pendek/tidak di-set. Lihat §5 dan §7.

---

## 2. Setup Wajib (sekali per project, jangan diulang tiap fitur)

- [ ] `lib/get-query-client.ts` — buat query client instance **per request** di server, pakai `React.cache()`, supaya tidak sharing state antar user/request:
  ```ts
  import { QueryClient } from "@tanstack/react-query";
  import { cache } from "react";

  export const getQueryClient = cache(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // default 1 menit — lihat §6 untuk override per query
      },
    },
  }));
  ```
- [ ] `app/providers.tsx` — client QueryClient dibuat **sekali** pakai `useState(() => new QueryClient(...))`, **jangan** `new QueryClient()` langsung di body komponen (bikin instance baru tiap render)
- [ ] Root layout membungkus app dengan `<QueryClientProvider>` (client-side instance dari providers.tsx) — instance ini **beda** dari yang dipakai `getQueryClient()` di server, itu memang benar & disengaja (server instance cuma umur 1 request, buat prefetch → dehydrate saja)
- [ ] Devtools (`@tanstack/react-query-devtools`) aktif di development — dipakai buat verifikasi prefetch jalan (§9)

---

## 3. Query Key — Aturan Wajib

Ini **akar** dari kebanyakan bug prefetch. Kalau key di server & client beda dikit saja (urutan object, tipe data param, dll), hydration cache miss → fetch ulang percuma.

- [ ] **Satu factory function per resource**, dipakai server DAN client, jangan tulis ulang array key manual di banyak tempat:
  ```ts
  // features/marketplace/products/query-keys.ts
  export const productKeys = {
    all: ["products"] as const,
    list: (filters?: ProductFilters) => ["products", "list", filters ?? {}] as const,
    detail: (id: string) => ["products", "detail", id] as const,
  };
  ```
- [ ] Param di dalam key **harus** primitif/plain object yang serializable & stabil urutannya — jangan taruh `Date` mentah, function, class instance, atau object yang urutan key-nya bisa berubah antar render
- [ ] Kalau filter/parameter default kosong, **normalisasi** sebelum masuk key (`filters ?? {}`, bukan kadang `undefined` kadang `{}`) — dua bentuk itu dianggap key berbeda oleh TanStack Query
- [ ] Server (prefetch) dan client (`useQuery`) **wajib** pakai fungsi factory yang sama persis, import dari 1 file — jangan hardcode array literal terpisah di kedua sisi walau isinya "keliatannya sama"

---

## 4. Kapan Prefetch, Kapan Tidak

**Prefetch kalau:**
- [ ] Data itu **critical untuk initial render** — kalau tanpa data ini, halaman kosong/skeleton besar-besaran (mis. daftar produk di halaman katalog, profil user di halaman `/me`)
- [ ] Data publik ATAU data yang server bisa akses dengan aman lewat pola BFF (baca cookie httpOnly, panggil Nest) — lihat §8
- [ ] Data yang **pasti** dibutuhkan, bukan "mungkin dibutuhkan kalau user klik sesuatu"

**JANGAN prefetch kalau:**
- [ ] Data di balik interaksi user yang belum tentu terjadi (mis. isi modal yang baru muncul kalau tombol diklik) — pakai `useQuery` biasa dengan `enabled`, atau prefetch **saat hover/intent** (§7), bukan saat halaman pertama load
- [ ] Data sensitif yang aksesnya baru valid di momen tertentu (mis. isi konten order — `GET /orders/:id/items/:orderItemId/content` di fitur marketplace sengaja **on-demand**, bukan prefetch, karena itu data rahasia/kredensial yang tidak perlu di-load duluan)
- [ ] Mutation-only data (hasil dari POST/PATCH) — prefetch cuma untuk `GET`/query, bukan untuk hal yang sifatnya action

---

## 5. Pola Dasar — Single Query

```tsx
// app/(public)/products/page.tsx  (Server Component)
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { productKeys } from "@/features/marketplace/products/query-keys";
import { getProducts } from "@/features/marketplace/products/api.server";
import { ProductGrid } from "@/components/marketplace/product-grid";

export default async function ProductsPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: productKeys.list(),
    queryFn: getProducts,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductGrid />{/* client component, pakai useQuery(productKeys.list(), getProductsClient) */}
    </HydrationBoundary>
  );
}
```

- [ ] `HydrationBoundary` **sekecil mungkin scope-nya** — bungkus cuma bagian yang butuh data itu, jangan bungkus seluruh `<body>` kalau cuma 1 komponen kecil yang butuh (biar dehydrate payload tidak menggelembung)
- [ ] Fetcher yang dipanggil di server (`getProducts` dari `api.server.ts`) boleh beda implementasi dari fetcher client (`api.ts` yang manggil lewat Route Handler `/api/...`) — **tapi hasil bentuk datanya harus identik**, karena keduanya "mengisi cache" dengan key yang sama

---

## 6. `staleTime` — Aturan Paling Sering Kelewat

Default `staleTime` TanStack Query adalah `0` — artinya begitu data di-hydrate ke client, dianggap **langsung stale**, dan kalau ada trigger refetch (mount, window focus, dst), TanStack Query akan **fetch ulang seketika**. Ini yang bikin prefetch kelihatan "sia-sia": data sudah ada dari server, tapi 1 detik kemudian di-fetch ulang di client.

- [ ] **Set `staleTime` > 0 untuk semua data yang di-prefetch**, minimal beberapa detik, idealnya sesuai karakteristik data:
  - Data jarang berubah (daftar produk, profil user, katalog API directory) → `staleTime: 60_000` (1 menit) atau lebih
  - Data realtime/live (harga forex, chat message) → **tidak usah di-prefetch buat "live update"-nya** — prefetch cuma buat histori awal (candle terakhir, pesan lama), live update-nya lewat WebSocket/SSE yang langsung `setQueryData`, bukan refetch berkala
  - Data yang harus selalu fresh saat dibuka (mis. status order yang sedang diproses) → `staleTime` pendek (5-10 detik) tapi tetap **bukan 0**, supaya minimal tidak dobel-fetch persis sesaat setelah hydrate
- [ ] Taruh `staleTime` di `queryOptions` bersama (satu tempat, dipakai server prefetch & client `useQuery`), **jangan** set beda antara server dan client — kalau beda, perilaku hydration jadi tidak konsisten

---

## 7. Prefetch Paralel — Hindari Waterfall

- [ ] Kalau 1 halaman butuh beberapa data sekaligus (mis. halaman detail order butuh `order detail` + `user profile`), **jangan** `await` satu-satu berurutan:
  ```ts
  // ❌ SALAH — waterfall, request kedua nunggu pertama selesai
  await queryClient.prefetchQuery({ queryKey: orderKeys.detail(id), queryFn: ... });
  await queryClient.prefetchQuery({ queryKey: authKeys.me(), queryFn: ... });

  // ✅ BENAR — jalan paralel
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: orderKeys.detail(id), queryFn: ... }),
    queryClient.prefetchQuery({ queryKey: authKeys.me(), queryFn: ... }),
  ]);
  ```
- [ ] Kalau query B **memang butuh hasil** query A (dependent query, mis. butuh `productId` dari hasil lain) → itu baru boleh sequential, tapi usahakan sesedikit mungkin level dependency-nya
- [ ] Prefetch di **level halaman/layout**, bukan bertingkat-tingkat di banyak nested Server Component kalau tidak perlu — makin dalam nesting-nya, makin gampang ke-waterfall tanpa sadar

---

## 8. Prefetch + Auth (BFF) — Aturan Ketat

Sesuai arsitektur BFF yang sudah dipakai (lihat dokumen fitur profile & oauth):

- [ ] Server Component **boleh** baca cookie `nl_access` (httpOnly) via `cookies()` dan langsung panggil Nest untuk prefetch data yang butuh auth (`me`, `orders/mine`, dst)
- [ ] Server Component **tidak bisa** menulis/refresh cookie — jadi prefetch data auth **mengasumsikan** token sudah fresh (di-refresh oleh Middleware sebelum request sampai ke render, sesuai pola yang sudah ditetapkan)
- [ ] Kalau prefetch di server dapat `401` (token ternyata tetap invalid) → **jangan** biarkan itu jadi unhandled error yang bikin seluruh page crash. Tangkap, dan:
  - Untuk halaman yang wajib login → redirect ke `/login` dari Server Component (`redirect()`), bukan render halaman kosong
  - Untuk data opsional (nice-to-have) → biarkan `prefetchQuery` gagal dengan aman, client-side `useQuery` yang nanti retry/refetch normal
- [ ] **Jangan prefetch data auth-only di halaman publik** (mis. jangan prefetch `me` di landing page yang bisa diakses tanpa login) — buang-buang request untuk visitor yang belum login

---

## 9. Verifikasi Prefetch Beneran Jalan

- [ ] Buka React Query Devtools → query yang di-prefetch harus muncul dengan status **`success`** begitu halaman pertama render (bukan `pending/fetching`)
- [ ] Buka Network tab browser → request ke `/api/...` untuk data yang sudah di-prefetch **tidak boleh muncul** saat page load pertama (kalau muncul, berarti hydration cache-nya miss — cek §3 query key & §6 staleTime)
- [ ] View Source / disable JS sementara → data yang di-prefetch harus **sudah ada di HTML awal** (bukti benar-benar SSR, bukan cuma "kelihatan cepat karena cache client")
- [ ] Cek payload `dehydrate()` tidak membengkak — kalau prefetch keseluruhan list besar padahal yang ditampilkan cuma 10 item pertama, itu tanda over-fetching di server

---

## 10. Anti-Pattern — Yang Sering Bikin "Prefetch" Percuma

- [ ] ❌ Prefetch di Server Component, tapi fetcher client (`useQuery`) manggil endpoint/format response yang beda dari fetcher server — hasilnya cache "kelihatan" ada tapi bentuknya nggak cocok, client tetap refetch atau malah error type mismatch
- [ ] ❌ Bungkus `HydrationBoundary` di root layout untuk **semua** query sekaligus — bikin tiap halaman ikut nge-dehydrate data yang tidak relevan buat halaman itu
- [ ] ❌ Pakai `useEffect(() => { fetch... }, [])` di client component padahal datanya sudah bisa di-prefetch dari Server Component — ini balik lagi ke pola lama (fetch-on-mount) yang justru ingin dihindari
- [ ] ❌ `prefetchQuery` untuk data yang **tidak dipakai** `useQuery` dengan key yang sama di client manapun — kalau tidak ada yang "mengklaim" hasil prefetch itu, ya sia-sia, jadi network request tambahan tanpa manfaat
- [ ] ❌ Set `staleTime: 0` (default) untuk data yang di-prefetch → langsung stale, langsung refetch, prefetch jadi tidak ada gunanya (lihat §6)
- [ ] ❌ Prefetch query yang butuh param dari `searchParams`/`params` tapi query key-nya tidak menyertakan param itu — beda halaman (`?page=2`) tapi key sama semua, cache jadi ketuker

---

## 11. Peta Cepat — Fitur Existing & Rekomendasi Prefetch-nya

| Fitur | Data | Prefetch? | staleTime disaranin |
|---|---|---|---|
| Katalog produk (publik) | `products.list()` | ✅ selalu | 60s+ |
| Detail produk | `products.detail(id)` | ✅ selalu | 60s+ |
| Profil user (`/me`) | `auth.me()` | ✅ (server baca cookie) | 30-60s |
| Riwayat order | `orders.mine()` | ✅ kalau BFF, else client-only | 10-15s |
| Detail order | `orders.detail(id)` | ✅ kalau BFF | 10-15s |
| Isi konten order (key/kredensial) | `orders.content(...)` | ❌ on-demand saja | n/a |
| Histori chat (pesan lama) | `chat.messages(convId)` (page pertama) | ✅ page pertama saja | pendek (5-10s), live update via socket bukan refetch |
| Harga forex realtime | tick/candle | ❌ jangan prefetch buat live tick — prefetch candle histori awal saja, live-nya SSE/WS | n/a untuk live |
| API Directory listing | `apiServices.list()` | ✅ selalu | 60s+ (jarang berubah) |
| API key list (dashboard) | `apiKeys.list()` | ✅ kalau BFF | 15-30s |
