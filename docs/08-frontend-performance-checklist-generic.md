# Frontend Performance Checklist — Generic, Reusable Antar Project

Checklist ini pelengkap dari `tanstack-query-prefetch-rules-generic.md` — prefetch cuma 1 lapisan. Dokumen ini nutupin lapisan lain yang sama pentingnya biar app kerasa *smooth, no delay*, apapun project-nya (Next.js App Router).

Prinsip dasar: **orang nggak sensitif ke "berapa lama loading", mereka sensitif ke "ada respons instan atau nggak" begitu mereka berinteraksi.** Checklist ini disusun dari yang paling murah/berdampak duluan.

---

## 1. Perceived Performance (paling murah, paling kerasa)

- [ ] **Optimistic UI untuk semua mutation** yang aman di-rollback (like, tambah keranjang, kirim pesan, toggle status) — update UI duluan sebelum server konfirmasi, rollback kalau gagal. Jangan tunggu round-trip buat nampilin efek klik
- [ ] **Skeleton yang bentuknya sama persis** dengan konten asli (jumlah baris, tinggi card, dst) — bukan spinner generik di tengah layar. Skeleton yang mirip konten asli juga mencegah layout shift
- [ ] **`useTransition`/`isPending`** buat nge-dim/disable elemen yang lagi transisi navigasi, daripada layar blank sampai halaman baru siap
- [ ] **Feedback instan di setiap interaksi** (klik tombol → ada state visual dalam <100ms, walau data aslinya belum kelar) — button loading state, ripple, disabled state, dll

---

## 2. Hindari Waterfall (fetching & rendering)

- [ ] Prefetch data critical dari Server Component, paralel (`Promise.all`), bukan sequential — detail lengkap ada di dokumen prefetch terpisah
- [ ] **Prefetch on intent**: trigger fetch data tambahan saat `onMouseEnter`/hover link, bukan nunggu klik. Next.js `<Link>` sudah auto-prefetch route-nya sendiri secara default
- [ ] **Suspense boundary granular** — pecah halaman jadi beberapa boundary kecil (streaming SSR) via `loading.tsx` atau `<Suspense>` manual, supaya bagian yang datanya sudah siap langsung tampil, tidak nunggu bagian paling lambat
- [ ] Jangan taruh `await` blocking di tengah komponen kalau hasilnya tidak dibutuhkan komponen di bawahnya — pindahkan fetch itu sejajar/paralel

---

## 3. Bundle & JavaScript di Client

Data sudah ada bukan jaminan cepat — kalau browser masih sibuk parse/execute JS, tetap kerasa delay.

- [ ] **Minimalkan `'use client'`** — makin sedikit komponen jadi client component, makin kecil JS yang dikirim. Server Component defaultnya zero JS ke client
- [ ] **`next/dynamic`** untuk komponen berat yang tidak critical di initial view (modal, chart, rich text editor, library besar) — load on-demand
- [ ] **Cek bundle size beneran**, jangan nebak: `next build` output breakdown, atau `@next/bundle-analyzer`. Sering ada 1 library berat (full import lodash, moment.js, dsb) yang nyumbang delay besar tanpa disadari
- [ ] Ganti library berat dengan alternatif ringan kalau memungkinkan (mis. `date-fns` dengan tree-shaking vs `moment.js` full bundle)
- [ ] Import spesifik, bukan barrel import besar (`import debounce from 'lodash/debounce'`, bukan `import { debounce } from 'lodash'`)

---

## 4. Gambar & Font

Penyumbang lag paling sering diabaikan karena "kelihatan udah jadi", padahal berat.

- [ ] **`next/image` selalu**, jangan `<img>` mentah — otomatis lazy-load, resize, serve format modern (WebP/AVIF)
- [ ] **`priority` prop cuma untuk gambar above-the-fold** (hero, logo) — sisanya biarkan lazy default
- [ ] Set `sizes` prop yang akurat di `next/image` supaya browser tidak download gambar lebih besar dari yang ditampilkan
- [ ] **`next/font`** (self-hosted, tidak ada request runtime ke Google Fonts) + `display: swap` biar teks tidak invisible nunggu font
- [ ] Jangan load font weight/style yang tidak dipakai (tiap weight = 1 file tambahan)

---

## 5. Caching Layer di Luar Query Client

- [ ] **ISR / `revalidate`** untuk data yang tidak perlu real-time tapi juga tidak perlu prefetch tiap request (katalog yang update tiap beberapa menit, halaman konten)
- [ ] **CDN/edge caching** untuk asset statis dan halaman publik yang sama untuk semua orang
- [ ] **HTTP cache header dari backend** yang benar (`Cache-Control`, `ETag`) untuk endpoint publik — jangan semua endpoint default `no-cache` kalau memang tidak perlu
- [ ] Static asset (JS/CSS/gambar) dengan hash di filename → cache header `immutable, max-age` panjang, karena URL berubah tiap deploy

---

## 6. List Panjang & Render Berat

- [ ] **Virtualization** (`@tanstack/react-virtual` atau sejenis) untuk list panjang (riwayat transaksi, histori chat, tabel admin ratusan baris) — jangan render semua DOM node sekaligus
- [ ] **`React.memo`/`useMemo`/`useCallback`** untuk komponen yang re-render mahal padahal props tidak berubah — penting terutama kalau ada WebSocket/polling yang push update sering (harga, notifikasi, chat) dan bikin komponen lain ikut re-render tanpa perlu
- [ ] Pisahkan state yang sering berubah (mis. input form, counter live) ke komponen sekecil mungkin — supaya re-render tidak menjalar ke seluruh subtree

---

## 7. Ukur, Jangan Nebak

- [ ] **Chrome DevTools → Performance tab** — cari long task yang blocking main thread
- [ ] **Web Vitals** — pantau LCP (Largest Contentful Paint), INP (Interaction to Next Paint), CLS (Cumulative Layout Shift). Next.js punya built-in reporting (`useReportWebVitals`), atau pakai Vercel Analytics/sejenisnya
- [ ] **INP** khususnya paling relevan buat "kerasa delay pas klik" — kalau INP jelek, biasanya penyebabnya JS execution/re-render yang blocking, bukan network
- [ ] Lighthouse audit rutin (bukan cuma sekali pas awal project) — regresi performa sering masuk pelan-pelan tanpa disadari seiring fitur baru nambah

---

## 8. Checklist Adaptasi ke Project Baru

- [ ] Audit `'use client'` yang tidak perlu — biasanya nemu beberapa komponen yang sebenarnya bisa Server Component
- [ ] Cek apakah semua gambar sudah pakai `next/image`, bukan warisan `<img>` dari migrasi/copy-paste
- [ ] Tentukan mana data yang layak ISR/cache lama vs mana yang harus selalu fresh — jangan default semuanya `no-cache` atau semuanya `force-cache` tanpa mikir
- [ ] List/tabel mana di project ini yang berpotensi panjang (>100 item) → kandidat virtualization
- [ ] Jalankan Lighthouse + cek bundle analyzer di awal, catat baseline-nya, supaya ada pembanding kalau nanti performa ngedrop

---

## 9. Urutan Prioritas Kalau Waktu Terbatas

Kalau cuma sempat benerin beberapa hal dulu, urutan dampak/effort yang biasanya paling worth it:

1. Skeleton yang match bentuk konten asli + optimistic UI di mutation utama (§1) — murah, dampak kerasa langsung
2. `next/image` + `next/font` yang benar (§4) — biasanya penyumbang lag terbesar yang paling gampang dibenerin
3. Prefetch data critical + hilangkan waterfall (§2, lihat dokumen prefetch terpisah)
4. Audit bundle size, cari 1-2 library berat yang bisa diganti/dynamic-import (§3)
5. Virtualization untuk list yang memang sudah kerasa lag (§6) — jangan preemptive optimize list pendek
