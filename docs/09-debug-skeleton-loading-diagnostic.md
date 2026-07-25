# Diagnostic: Kenapa Skeleton Loading Masih Muncul (padahal harusnya prefetch)

> **Untuk AI coding assistant**: dokumen ini panduan audit sistematis. Tugasmu: telusuri codebase project Next.js ini mengikuti urutan di bawah, temukan root cause kenapa skeleton/loading state masih kelihatan sekilas (flash) atau lama padahal harusnya data sudah di-prefetch dari server, lalu perbaiki. Jangan asal tambah `loading={false}` atau hilangkan skeleton-nya — itu cuma nutupin gejala, bukan benerin akar masalahnya.

---

## 1. Definisikan Dulu Gejalanya (jangan asumsi)

Sebelum audit kode, konfirmasi salah satu dari 2 kondisi ini terjadi (beda akar masalah, beda fix):

- **A. Skeleton "flash" sekilas lalu hilang** — data sebenarnya sudah ada cepat, tapi UI sempat render skeleton dulu 1 frame sebelum data muncul. Ini soal *hydration/render timing*, bukan soal network lambat.
- **B. Skeleton nampil lama, baru hilang setelah beberapa ratus ms – detik** — ini soal *network request beneran terjadi di client* padahal harusnya tidak perlu (data harusnya sudah ada dari server).

Cara pastikan: buka DevTools → Network tab → reload halaman → filter by Fetch/XHR. Kalau ada request ke endpoint data yang **harusnya** sudah di-prefetch, itu kasus B. Kalau tidak ada request tapi skeleton tetap sempat kelihatan, itu kasus A.

---

## 2. Checklist Root Cause — Kasus B (ada request client yang harusnya tidak perlu)

Cek satu-satu di kode, urut dari yang paling sering jadi penyebab:

- [ ] **Query key server ≠ query key client.** Buka file prefetch di Server Component, bandingkan `queryKey` byte-per-byte dengan `queryKey` di `useQuery` yang dipakai client component. Kalau ada perbedaan (urutan properti object, default value `undefined` vs `{}`, param yang salah tipe), hydration cache **miss** dan client fetch ulang. → Fix: pastikan keduanya import dari 1 factory function yang sama, jangan hardcode array literal di 2 tempat.
- [ ] **`staleTime` tidak di-set (default 0).** Cek `defaultOptions` di query client, dan cek per-query `staleTime` untuk query yang di-prefetch. Kalau `0`/tidak ada, data langsung dianggap stale begitu hydrate, dan refetch trigger (mount/focus) langsung jalan. → Fix: set `staleTime` > 0 di tempat yang sama dipakai server & client.
- [ ] **`HydrationBoundary` tidak membungkus komponen yang benar**, atau tidak ada sama sekali. Cek apakah `dehydrate(queryClient)` benar-benar dikirim ke `<HydrationBoundary state={...}>` yang membungkus komponen client yang manggil `useQuery`. Kalau komponennya di luar boundary, dia tidak dapat cache hasil prefetch.
- [ ] **Server Component tidak benar-benar `await` prefetch.** Cek apakah ada `queryClient.prefetchQuery(...)` yang dipanggil **tanpa** `await` — kalau promise-nya tidak ditunggu, `dehydrate()` bisa jalan duluan sebelum data selesai di-fetch, jadi state yang di-dehydrate kosong.
- [ ] **Client component fetch manual di `useEffect`** sebagai pengganti/tambahan dari `useQuery` — ini pola fetch-on-mount lama yang independen dari cache TanStack Query sama sekali. Cari `useEffect(() => { fetch(...) }, [])` atau sejenisnya di komponen yang seharusnya sudah dapat data dari prefetch.
- [ ] **Fetcher client memanggil endpoint/format beda dari fetcher server.** Kalau server prefetch dari `getX()` (langsung ke backend/DB) tapi client `useQuery` manggil `getXClient()` yang lewat endpoint proxy berbeda dengan shape response berbeda — bisa keliatan "punya cache" tapi sebenarnya query berbeda secara efektif.
- [ ] **Ada refetch trigger agresif** — cek `refetchOnMount`, `refetchOnWindowFocus`, `refetchOnReconnect` di config global. Default TanStack Query beberapa di antaranya `true`. Kombinasi dengan `staleTime` pendek/0 bikin refetch kejadian terus meski data baru saja di-hydrate.
- [ ] **Komponen dengan `useQuery` di-render di route/segment berbeda dari yang di-prefetch** — misal prefetch terjadi di `page.tsx` A, tapi komponen konsumsinya dirender ulang di layout/route B yang tidak dapat hydration state yang sama (tiap route Server Component render process-nya independen kalau tidak lewat boundary yang benar).

---

## 3. Checklist Root Cause — Kasus A (flash sekilas walau data sudah ada)

- [ ] **Kondisi loading state salah baca.** Cek apakah komponen pakai `isLoading` (true kalau **tidak ada cache sama sekali**, termasuk pas hydrate pertama sebelum React selesai reconcile) padahal harusnya pakai `isPending` yang lebih sesuai, atau cek apakah logic-nya `if (!data)` padahal `data` sebenarnya sudah ada tapi sempat `undefined` di render pertama sebelum hydration selesai.
- [ ] **Suspense boundary yang salah level** — kalau pakai `useSuspenseQuery`, cek posisi `<Suspense fallback={<Skeleton />}>`. Kalau boundary-nya membungkus komponen yang lebih besar dari yang perlu, seluruh subtree itu nge-block sampai boundary itu resolve, walau sebagian datanya sudah siap dari prefetch.
- [ ] **Hydration mismatch bikin React re-render dari awal** — cek console browser ada warning "Hydration failed" atau "Text content does not match". Kalau ada, React akan discard hasil SSR dan render ulang dari client, yang otomatis munculin skeleton sesaat walau data sudah ada di HTML awal. Ini biasanya soal ada nilai yang beda antara server-render dan client-render (`Date.now()`, `Math.random()`, locale/timezone formatting, kondisi `typeof window !== 'undefined'`).
- [ ] **Loading state di-drive dari state lokal (`useState(true)`) yang di-set manual**, bukan dari `useQuery`'s `isPending`/`isFetching` — cek apakah ada logic custom seperti `const [loading, setLoading] = useState(true)` yang di-reset di `useEffect` walau data sebenarnya sudah tersedia dari cache/prefetch.

---

## 4. Langkah Audit yang Harus Dijalankan (urutan)

1. Identifikasi halaman/komponen spesifik yang dikeluhkan lambat/flash.
2. Baca Server Component-nya (`page.tsx` atau layout terkait) — cek §2 poin prefetch (query key, `await`, `HydrationBoundary`).
3. Baca client component yang konsumsi data-nya — cek §2 poin fetcher & config, dan §3 poin loading state.
4. Baca `lib/get-query-client.ts` dan `providers.tsx` — cek default options global (`staleTime`, `refetchOnMount`, dst).
5. Kalau semua di atas sudah benar tapi tetap ada delay, cek Network tab: apakah request-nya ke backend lambat beneran (network/server-side latency), bukan soal caching sama sekali — kalau begitu masalahnya bukan di TanStack Query, tapi di backend/response time atau jarak network (lihat dokumen performance checklist untuk lapisan lain: bundle size, image, font, dsb).
6. Setelah fix, verifikasi ulang: Network tab tidak ada request duplikat untuk data yang di-prefetch, dan console tidak ada hydration warning.

---

## 5. Fix Pattern Ringkas per Root Cause

| Root cause | Fix |
|---|---|
| Query key beda server/client | Satukan ke 1 factory function, import dari file yang sama di kedua sisi |
| `staleTime` 0/default | Set eksplisit di `queryOptions` bersama, sesuaikan durasi ke karakteristik data |
| `HydrationBoundary` salah taruh/tidak ada | Bungkus persis di sekitar komponen client yang butuh data itu |
| `prefetchQuery` tanpa `await` | Tambahkan `await`, atau `Promise.all([...])` kalau paralel dengan query lain |
| Fetch manual di `useEffect` | Ganti ke `useQuery` dengan key yang sama seperti hasil prefetch, hapus `useEffect` fetch manual |
| Fetcher client ≠ server (endpoint/shape beda) | Samakan bentuk response, atau minimal mapping-nya konsisten sebelum masuk cache |
| Refetch trigger agresif + staleTime pendek | Set `refetchOnMount: false` / `refetchOnWindowFocus: false` untuk data yang memang tidak perlu selalu fresh, kombinasikan dengan `staleTime` yang wajar |
| Suspense boundary kegedean | Pecah jadi boundary lebih granular, bungkus cuma bagian yang benar-benar butuh nunggu data itu |
| Hydration mismatch | Cari sumber non-deterministic render (`Date.now()`, random, `window`-dependent logic) yang jalan beda antara server & client, pindahkan ke `useEffect` (client-only) atau samakan hasilnya |
| Loading state manual (`useState`) tidak sinkron ke query | Ganti ke `isPending`/`isFetching` bawaan dari `useQuery`, hapus state loading manual yang terpisah |

---

## 6. Setelah Fix — Cara Verifikasi

- [ ] Network tab: reload halaman, tidak ada request ke endpoint yang sudah di-prefetch saat page load pertama
- [ ] View Source (bukan Elements/Inspect): data yang di-prefetch sudah ada di HTML mentah, bukan cuma muncul setelah JS jalan
- [ ] Console: tidak ada warning hydration mismatch
- [ ] React Query Devtools: query yang di-prefetch berstatus `success` sejak render pertama, bukan `pending`→`success`
- [ ] Skeleton/spinner cuma muncul untuk skenario yang **memang** butuh network beneran (mis. navigasi ke data yang belum pernah di-prefetch sama sekali), bukan untuk data yang seharusnya sudah instan
