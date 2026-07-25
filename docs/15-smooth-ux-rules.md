# 15. Aturan Smooth UX — Nodeline

Dokumen ini aturan konkret khusus untuk project ini, ditulis setelah menelusuri kasus nyata "kok masih ada skeleton padahal sudah prefetch". Berbeda dari `rule-prefetch.md` dan `08-frontend-performance-checklist-generic.md` yang generic, dokumen ini mencatat **keputusan arsitektur yang sudah diambil di Nodeline** dan alasannya, supaya tidak diulang salahnya.

---

## 1. Yang Paling Sering Salah Dipahami

### `loading.tsx` = skeleton di SETIAP navigasi (bukan cuma load pertama)

Ini akar masalah yang paling lama tidak ketemu.

Root layout Nodeline membaca `cookies()` untuk prefetch data user. Konsekuensinya: **semua route jadi dynamic**. Next.js tidak bisa cache RSC payload untuk route dynamic, jadi tiap soft navigation harus round-trip ke server dulu.

Selama round-trip itu, kalau ada `loading.tsx` di segmen tujuan, Next.js **wajib** menampilkannya — tidak peduli TanStack Query cache sudah penuh atau belum. Hasilnya:

| Aksi | Terlihat |
|---|---|
| Hard refresh | Smooth — HTML sudah lengkap, `loading.tsx` tidak pernah kelihatan |
| Klik nav link | Skeleton muncul, walau halaman itu baru dibuka 5 detik lalu |

**Aturan di project ini: JANGAN tambah `loading.tsx` untuk route yang datanya sudah di-handle TanStack Query.** Biarkan komponen sendiri yang memutuskan kapan menampilkan skeleton berdasarkan `isLoading` — yang otomatis `false` kalau cache sudah ada.

`loading.tsx` hanya layak dipakai untuk route yang benar-benar tidak punya cache client sama sekali dan datanya berat.

### `refetchOnMount` default `true` — dan ini bikin skeleton balik lagi

Default TanStack Query: setiap komponen mount, kalau data sudah stale, langsung refetch. Navigasi balik ke halaman = komponen mount = refetch = `isLoading`/`isFetching` true = skeleton lagi.

Di Nodeline sudah di-set `refetchOnMount: false` (di `app/providers.tsx` dan `lib/get-query-client.ts`). Data tetap segar lewat:
- `refetchInterval` untuk data yang memang perlu polling (orders)
- `invalidateQueries` setelah mutation

**Jangan aktifkan kembali `refetchOnMount` tanpa alasan kuat.**

### Server prefetch tidak membantu soft navigation

`prefetchQuery` di Server Component cuma jalan saat request ke server. Untuk soft navigation, server component memang jalan lagi — tapi itu artinya user menunggu backend dulu (~300-800ms), bukan langsung dapat.

Prefetch server bermanfaat untuk: **hard refresh, direct link, SEO, share link**. Bukan untuk klik-klik antar halaman.

Untuk soft navigation, yang membantu adalah **prefetch-on-hover** (lihat §3).

---

## 2. Konfigurasi Query Client (jangan diubah tanpa mengukur)

Nilai ini sudah disesuaikan ke karakteristik Nodeline. Server (`lib/get-query-client.ts`) dan client (`app/providers.tsx`) **wajib sama**.

```ts
defaultOptions: {
  queries: {
    staleTime: 60 * 1000,      // 1 menit
    gcTime: 30 * 60 * 1000,    // cache bertahan 30 menit
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,     // kunci: revisit render dari cache
  },
}
```

Kenapa `gcTime` 30 menit: default 5 menit terlalu pendek. User yang bolak-balik antar halaman dalam satu sesi kerja akan kehilangan cache dan harus fetch ulang.

### staleTime per resource

| Resource | staleTime | Alasan |
|---|---|---|
| `products.list()` / `products.detail()` | 60s | Katalog jarang berubah |
| `apiDirectory.list()` / `.detail()` | 60s | Sangat jarang berubah |
| `auth.me` | 5 menit | Profil hampir tidak berubah dalam satu sesi |
| `orders.all` | 60s + `refetchInterval: 30s` | Status pesanan perlu update, tapi background |
| `apiKeys.list` | 60s | Berubah hanya lewat mutation user sendiri |
| Chat messages | pendek | Live update lewat Socket.IO, bukan refetch |

**Aturan: `staleTime` di server prefetch, di `useQuery`, dan di prefetch-on-hover harus sama untuk key yang sama.** Kalau beda, perilaku hydration jadi tidak konsisten.

---

## 3. Prefetch-on-Hover — Cara Kerjanya di Nodeline

Ini mekanisme utama yang bikin navigasi terasa instan.

### Untuk nav link (sidebar, header, dropdown)

Pakai `useRoutePrefetch()` dari `lib/use-route-prefetch.ts`:

```tsx
const prefetchRoute = useRoutePrefetch();

<Link
  href="/orders"
  onMouseEnter={() => prefetchRoute("/orders")}
  onFocus={() => prefetchRoute("/orders")}
>
  Pesanan
</Link>
```

Hook ini punya map route → query. **Kalau menambah halaman baru dengan data, daftarkan di map itu**, jangan bikin prefetch ad-hoc.

### Bahaya: shape mismatch

Pernah kejadian crash `e.map is not a function` karena prefetch menyimpan response mentah `{ products: [...] }` ke cache, sedangkan `useQuery` di halaman mengembalikan array.

**Cache harus diisi dengan bentuk yang IDENTIK dengan return value `queryFn` di halaman tujuan.** Karena itu setiap entry di `routePrefetchMap` punya field `select` untuk normalisasi. Jangan hapus itu.

Cek sebelum menambah entry baru:
1. Buka hook `useQuery` halaman tujuan
2. Lihat apa yang di-return `queryFn`-nya — array? object? nested?
3. Pastikan `select` di prefetch map menghasilkan bentuk yang sama

### Untuk card/list item → detail

Prefetch langsung di komponen card (lihat `components/marketplace/card-product.tsx` dan `app/api-directory/api-directory-page.tsx`):

```tsx
const queryClient = useQueryClient();

const prefetchDetail = () => {
  queryClient.prefetchQuery({
    queryKey: queryKeys.marketplace.products.detail(product.id),
    queryFn: () => fetch(`/api/v1/bff/products/${product.id}`).then(r => r.json()),
    staleTime: 60_000,
  });
};

<Link href={`/marketplace/${product.id}`} onMouseEnter={prefetchDetail} onFocus={prefetchDetail}>
```

---

## 4. Latency: Di Mana Waktu Terbuang

Hasil pengukuran nyata di production. Berguna sebagai baseline dan untuk tahu apa yang layak dioptimasi.

| Path | Waktu |
|---|---|
| API endpoint tanpa query DB (`/api/v1/`) | ~160ms |
| API endpoint dengan query DB, DB di Asia | ~300ms |
| API endpoint dengan query DB, DB di US East | ~700ms (jangan ulangi) |
| Lewat BFF (`app.sandimf.dev/api/v1/bff/*`) | ~700-800ms |
| Lewat BFF dengan edge cache HIT | ~10ms |

Pelajaran:

**1. Region DB menentukan segalanya.** DB di `us-east-1` sementara VPS di Asia = ~300ms per query. Sekarang sudah dipindah ke region Asia. Kalau bikin project baru, tentukan region DB dekat aplikasi sejak awal.

**2. BFF menambah ~400ms.** Browser → Cloudflare Worker (edge manapun) → VPS Asia → DB. Worker tidak selalu dekat VPS. Ini harga dari pola BFF, dan sebagian besar tertutup oleh edge cache (§5).

**3. Setiap query DB ~300ms** (termasuk network). Jadi endpoint yang jalanin 2 query = 600ms. Ini kenapa merge COUNT ke SELECT berdampak nyata.

---

## 5. Caching Layer

### Edge cache di BFF

`app/api/v1/bff/[...path]/route.ts` menyimpan response GET publik di Cloudflare Cache API.

| Endpoint | TTL |
|---|---|
| `/products` | 60s |
| `/api-services` | 60s |
| `/categories` | 5 menit |
| `/payment-methods` | 5 menit |

Aturan penting:
- **Hanya untuk request tanpa session cookie.** Kalau ada session, response bisa user-specific — tidak boleh masuk shared cache. Ini sudah di-guard di kode, jangan dilonggarkan.
- Hanya method GET.
- Cache write failure tidak boleh menggagalkan request (sudah di-try/catch).

Kalau menambah endpoint publik baru yang read-heavy, tambahkan ke `CACHEABLE_PREFIXES`.

### Query DB: satu round-trip, bukan dua

Pola yang salah (2 round-trip):
```ts
const [{ count }] = await db.select({ count: sql`count(*)` }).from(t).where(cond);
const rows = await db.select().from(t).where(cond).limit(n);
```

Pola yang benar (1 round-trip):
```ts
const rows = await db
  .select({ ...fields, total: sql<number>`count(*) over()::int` })
  .from(t).where(cond).limit(n);
const total = rows[0]?.total ?? 0;
```

Sudah diterapkan di `products.service.ts` dan `api-directory.service.ts`. **Pakai pola ini untuk endpoint paginated baru.**

---

## 6. Checklist Sebelum Menambah Halaman Baru

- [ ] Query key pakai factory dari `lib/query-keys.ts`, jangan array literal
- [ ] `staleTime` di-set eksplisit, sama antara prefetch dan `useQuery`
- [ ] **Jangan** buat `loading.tsx` — biarkan komponen handle `isLoading`
- [ ] Kalau halaman punya nav link ke sana, daftarkan di `routePrefetchMap`
- [ ] Kalau halaman menampilkan list yang bisa diklik ke detail, tambahkan prefetch-on-hover di card
- [ ] Kalau data publik dan read-heavy, pertimbangkan tambah ke `CACHEABLE_PREFIXES` di BFF
- [ ] Endpoint paginated: pakai `count(*) over()`, jangan query COUNT terpisah
- [ ] Server prefetch **hanya** untuk halaman yang penting di-SSR (SEO, share link) — bukan untuk semua halaman

---

## 7. Cara Diagnosis Kalau Ada Delay Lagi

Urutan yang terbukti efektif, jangan langsung tebak:

**1. Ukur backend dulu**
```bash
curl -s -o /dev/null -w "ttfb: %{time_starttransfer}s\n" "https://api.sandimf.dev/api/v1/<endpoint>"
```
Kalau >500ms, masalahnya di backend/DB, bukan frontend.

**2. Bandingkan direct vs BFF**
```bash
curl -s -o /dev/null -w "%{time_starttransfer}s\n" "https://app.sandimf.dev/api/v1/bff/<endpoint>"
```
Selisih besar = overhead BFF, pertimbangkan edge cache.

**3. Cek jumlah query per endpoint**
Baca service method-nya. Ada COUNT terpisah? Ada N+1?

**4. Bedakan hard refresh vs soft navigation**
- Refresh smooth, navigasi skeleton → hampir pasti `loading.tsx` atau `refetchOnMount`
- Dua-duanya lambat → backend/DB

**5. Network tab**
Request yang sama muncul 2x (server + client) → query key beda antara prefetch dan `useQuery`, atau `staleTime` 0.

**6. React Query Devtools**
Query yang di-prefetch harus `success` sejak render pertama. Kalau `pending` → cache miss.

---

## 8. Yang Sudah Dicoba dan Tidak Dipakai

Dicatat supaya tidak dicoba ulang:

| Pendekatan | Kenapa tidak dipakai |
|---|---|
| Server prefetch dengan `cookies()` di `/orders`, `/api-keys` | Bikin route dynamic dan blocking; setiap navigasi round-trip ke server dan `loading.tsx` muncul. Diganti dengan prefetch-on-hover. |
| `loading.tsx` di semua route | Skeleton muncul di setiap soft navigation. Dihapus. |
| Pindahkan seluruh API ke Cloudflare Workers | Socket.IO, `ws`, `sharp`, `argon2` tidak jalan di Workers. Butuh rewrite besar. Edge cache di BFF memberi sebagian besar manfaatnya tanpa rewrite. |

---

## 9. Referensi

- `rule-prefetch.md` — aturan prefetch generic
- `08-frontend-performance-checklist-generic.md` — checklist performa generic (bundle, image, font, virtualization)
- `09-debug-skeleton-loading-diagnostic.md` — panduan diagnosis skeleton generic
- `02-architecture.md` — arsitektur keseluruhan
