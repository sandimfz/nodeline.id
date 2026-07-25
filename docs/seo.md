# Panduan Lengkap SEO di Next.js (App Router, 2026)

> Berdasarkan dokumentasi resmi Next.js dan beberapa sumber teknis terbaru (2026). Fokus pada App Router (Next.js 15/16), karena ini yang berlaku saat ini — bukan Pages Router lama (`next/head`).

---

## 1. Konsep Dasar: Kenapa Next.js "Unggul" untuk SEO

Next.js mengirim HTML yang sudah di-render penuh ke crawler (bukan shell kosong seperti SPA React biasa). App Router menambahkan:

- **Metadata API** — pengganti `next/head`, deklaratif dan type-safe.
- **React Server Components (RSC)** — konten dirender di server, tidak butuh JS untuk ter-index.
- **File convention** untuk `sitemap.xml`, `robots.txt`, dan OG image.
- **Rendering strategy per-route** (SSG/SSR/ISR) yang memengaruhi kecepatan & crawlability.

Masalah SEO paling umum di Next.js biasanya berasal dari 3 hal: lupa set `metadataBase`, halaman konten yang di-fetch di Client Component (`useEffect`), dan crawler AI (GPTBot, ClaudeBot, PerplexityBot) yang tidak mengeksekusi JavaScript sama sekali.

---

## 2. Metadata API — Fondasi On-Page SEO

Di App Router, **jangan pakai `next/head`** (itu pola Pages Router). Gunakan salah satu dari dua export berikut di `layout.tsx` atau `page.tsx` (tidak boleh keduanya sekaligus di segment yang sama):

### 2.1 Metadata statis (root layout)

```tsx
// app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://contohdomain.com'),
  title: {
    default: 'Nama Situs — Tagline Singkat',
    template: '%s | Nama Situs',
  },
  description: 'Deskripsi situs 140–160 karakter yang jelas dan menarik.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Nama Situs',
    images: ['/og-default.png'],
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
}
```

Poin penting:
- **`metadataBase` wajib diisi.** Tanpa ini, semua URL relatif (canonical, OG image) tidak akan jadi absolute URL — akibatnya preview media sosial rusak dan crawler AI bisa melewatkan gambar sama sekali.
- **`title.template`** otomatis membungkus title tiap halaman anak, misalnya `"Artikel A" | Nama Situs`.
- **`alternates.canonical`** mencegah masalah duplicate content dari query string.

### 2.2 Metadata dinamis (`generateMetadata`)

Untuk halaman yang datanya bergantung pada params atau fetch (misalnya blog/produk):

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from 'next'
import { getPost } from '@/lib/posts'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) return { title: 'Tidak ditemukan', robots: { index: false } }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      images: [{ url: post.coverImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  }
}
```

Catatan: di Next.js 15+, `params` adalah `Promise`, jadi wajib `await`. Next.js otomatis melakukan memoize fetch, jadi fetch yang sama di dalam komponen halaman tidak dobel.

### 2.3 Mengontrol indexability

Gunakan `robots` untuk mem-`noindex` halaman preview, hasil pencarian internal, atau dashboard berlogin:

```tsx
export const metadata: Metadata = {
  robots: { index: false, follow: true, nocache: true },
}
```

### 2.4 Canonical URL & pagination

Set `alternates.canonical` di **setiap** halaman yang bisa di-index. Untuk halaman arsip berpaginasi (`/blog?page=2`), canonical harus menunjuk ke URL paginasi itu sendiri, bukan ke `/blog` root — karena `rel="prev/next"` sudah tidak dipakai Google.

---

## 3. Strategi Rendering (SSG / ISR / SSR / CSR) dan Dampaknya ke SEO

Semua mode di Next.js mengirim HTML ke crawler, tapi freshness dan kecepatannya berbeda. Pilih per-route, bukan per-project.

| Jenis konten | Mode yang disarankan | Alasan |
|---|---|---|
| Halaman marketing, dokumentasi, blog evergreen | **SSG** | LCP tercepat, biaya serving termurah, full crawlable |
| Katalog produk dengan harga berubah harian | **ISR** | Kecepatan static + freshness terjadwal |
| Dashboard personal, halaman login | **SSR** | Data per-request, tapi sebaiknya `noindex` |
| Widget interaktif di dalam halaman statis | **SSG shell + Client Component** | HTML tetap crawlable, bagian interaktif jadi "pulau" |

- **SSG (default):** dipakai otomatis jika halaman tidak memanggil `cookies()`, `headers()`, atau fetch dinamis. Next.js prerender saat build dan serve dari CDN.
- **SSR:** render ulang di server tiap request. Cocok untuk data per-user, tapi ada latency tambahan — hindari untuk halaman marketing.
- **ISR:** cache statis yang di-revalidate berkala secara background.

```tsx
// app/products/[id]/page.tsx
export const revalidate = 300 // detik

export default async function ProductPage({ params }) {
  const { id } = await params
  const product = await fetch(`https://api.example.com/products/${id}`, {
    next: { revalidate: 300 },
  }).then((r) => r.json())
  return <ProductView product={product} />
}
```

- **CSR (hindari untuk halaman konten):** kalau Client Component mengambil konten utama lewat `useEffect`, data itu **tidak** masuk ke HTML awal. Googlebot mungkin masih bisa menunggu render queue, tapi kebanyakan crawler AI tidak mengeksekusi JavaScript sama sekali dan akan melewatkannya.

---

## 4. Crawler AI (GPTBot, ClaudeBot, PerplexityBot) — Risiko yang Sering Terlewat

Sebagian besar crawler AI **tidak menjalankan JavaScript** — mereka hanya membaca HTML mentah yang dikirim server. Kalau halaman kamu SSG/ISR, aman. Masalah muncul di 3 titik:

1. **Route yang tanpa sengaja jadi dinamis** — memanggil `cookies()` atau `headers()` di Server Component membuat halaman jadi dynamic rendering; kalau upstream datanya lambat, crawler dengan timeout pendek bisa menyerah.
2. **Client Component yang fetch konten utama** — artikel yang body-nya di-fetch via `useEffect` akan tampil kosong ke crawler non-JS.
3. **Structured data yang hilang** — sistem AI sangat mengandalkan JSON-LD karena tidak ambigu.

Mitigasi: simpan konten utama di Server Component, render dari data yang di-fetch di server, sertakan JSON-LD di setiap halaman yang bisa di-index, dan pastikan sitemap punya `lastModified` yang akurat (dipakai sebagai sinyal recrawl).

---

## 5. Sitemap & robots.txt (File Convention App Router)

### 5.1 `app/sitemap.ts` → otomatis jadi `/sitemap.xml`

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/posts'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts()
  const postEntries = posts.map((p) => ({
    url: `https://contohdomain.com/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [
    { url: 'https://contohdomain.com', changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://contohdomain.com/blog', changeFrequency: 'daily', priority: 0.9 },
    ...postEntries,
  ]
}
```

Untuk situs dengan lebih dari 50.000 URL, tambahkan `generateSitemaps()` agar Next.js otomatis membuat sitemap terpisah (`sitemap/0.xml`, `sitemap/1.xml`, dst.) beserta index-nya.

### 5.2 `app/robots.ts` → otomatis jadi `/robots.txt`

```ts
// app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin/'] }],
    sitemap: 'https://contohdomain.com/sitemap.xml',
    host: 'https://contohdomain.com',
  }
}
```

---

## 6. Structured Data (JSON-LD)

JSON-LD adalah format yang paling konsisten dipahami mesin pencari maupun sistem AI. Sisipkan `<script type="application/ld+json">` langsung di page/layout (Server Component, supaya ikut masuk ke HTML awal):

```tsx
// app/blog/[slug]/page.tsx
export default async function BlogPost({ params }) {
  const { slug } = await params
  const post = await getPost(slug)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: [post.coverImage],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: post.author.name,
      url: `https://contohdomain.com/authors/${post.author.slug}`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Nama Situs',
      logo: { '@type': 'ImageObject', url: 'https://contohdomain.com/logo.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://contohdomain.com/blog/${slug}` },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Article post={post} />
    </>
  )
}
```

Tipe schema.org lain yang umum dipakai: `Product`, `FAQPage`, `HowTo`, `BreadcrumbList`, `SoftwareApplication` — pilih sesuai jenis konten.

---

## 7. Open Graph Image Dinamis

Next.js App Router punya konvensi file khusus: `opengraph-image.tsx` di dalam folder route, menggunakan `ImageResponse` dari `next/og` (sudah built-in, tidak perlu install `@vercel/og` terpisah di App Router).

```tsx
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const alt = 'Blog Post'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await fetch(`https://api.example.com/posts/${slug}`).then((res) => res.json())

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: 'linear-gradient(to bottom, #000, #1a1a1a)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '80px',
        }}
      >
        <h1 style={{ fontSize: 72, fontWeight: 'bold', textAlign: 'center' }}>{post.title}</h1>
      </div>
    ),
    { ...size }
  )
}
```

Catatan: `ImageResponse` hanya mendukung flexbox dan sebagian CSS (bukan `display: grid`), karena di-render lewat Satori + resvg.

---

## 8. Core Web Vitals di Next.js (LCP, INP, CLS)

Tiga metrik ini adalah sinyal ranking utama dari sisi user-experience.

### 8.1 LCP — `next/image`

```tsx
import Image from 'next/image'

export default function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="Deskripsi gambar yang jelas"
      width={1200}
      height={630}
      priority // untuk gambar LCP — preload, jangan lazy-load
      sizes="(max-width: 768px) 100vw, 1200px"
    />
  )
}
```

`next/image` otomatis: serve WebP/AVIF, generate `srcset` responsif, lazy-load gambar di luar viewport, dan mencegah layout shift. Prop `priority` paling sering terlewat — pasang di gambar LCP untuk hasil signifikan pada waktu load.

### 8.2 CLS — `next/font`

```tsx
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
```

`next/font` self-host font, generate fallback yang size-adjusted, dan menghilangkan flash of unstyled text — semua ini mengurangi layout shift dari font-swap.

### 8.3 INP — React Server Components

INP mengukur kecepatan respons halaman terhadap klik/interaksi. Cara terbaik menurunkannya adalah mengirim lebih sedikit JavaScript ke client:

- Audit komponen mana yang benar-benar butuh `'use client'`.
- Anti-pattern umum: menandai komponen parent sebagai Client Component hanya karena satu child-nya interaktif. Solusinya: parent tetap Server Component, child interaktif dikirim sebagai prop.

### 8.4 Script pihak ketiga — `next/script`

```tsx
import Script from 'next/script'

<Script
  src="https://plausible.io/js/script.js"
  strategy="afterInteractive"
  data-domain="contohdomain.com"
/>
```

Gunakan `afterInteractive` untuk analytics, `lazyOnload` untuk widget chat yang bisa ditunda. Jangan pernah load tag manager dengan `beforeInteractive`.

---

## 9. Checklist SEO Next.js App Router

| Item | Implementasi | Status |
|---|---|---|
| `metadataBase` di root layout | `metadataBase: new URL('https://domain.com')` | Wajib |
| Title unik per halaman | `metadata` statis atau `generateMetadata()` + `title.template` | Wajib |
| Description 140–160 karakter | Field `description` di setiap halaman | Wajib |
| Canonical URL | `alternates.canonical` di semua halaman indexable | Wajib |
| Open Graph image (1200×630) | `openGraph.images` di root atau per halaman | Wajib |
| Twitter Card | `twitter.card: 'summary_large_image'` | Wajib |
| Sitemap | `app/sitemap.ts` dengan `lastModified` | Wajib |
| robots.txt | `app/robots.ts` yang mereferensi sitemap | Wajib |
| JSON-LD structured data | `<script>` inline di layout/page | Wajib untuk rich result |
| Gambar LCP pakai `priority` | `<Image priority />` di hero | Wajib |
| Font via `next/font` | Self-hosted, fallback size-adjusted | Wajib |
| Script pihak ketiga via `next/script` | Strategy `afterInteractive`/`lazyOnload` | Wajib |

---

## 10. Kesalahan Umum yang Paling Sering Menggerus Traffic

1. **Lupa `metadataBase`** — OG image jadi relative URL, preview medsos rusak, gambar bisa dilewati crawler AI.
2. **CSR untuk halaman konten** — body artikel di-fetch di Client Component via `useEffect` → hanya kirim shell kosong.
3. **Tidak set canonical di halaman berpaginasi** — `/blog?page=2` tanpa self-canonical bikin Google salah konsolidasi atau malah index dua-duanya.
4. **Mengabaikan crawlability crawler AI** — halaman yang baru render setelah JS jalan akan dilewati GPTBot/PerplexityBot/ClaudeBot.
5. **Setup `next/image` yang salah** — lupa `priority` di gambar LCP, lupa `sizes`, atau membungkus `<Image>` dalam div yang membatasi width sehingga merusak `srcset` responsif.
6. **Preview deployment ter-index** — deployment preview (mis. di Vercel) tanpa header `noindex` bisa ikut ter-index Google dan mendilusi otoritas domain utama.

---

## 11. FAQ Singkat

**Perlu pakai `next/head` di App Router?**
Tidak. Itu pola Pages Router lama. Di App Router, ekspor `metadata` object atau fungsi `generateMetadata()`.

**SSG atau ISR, mana yang lebih baik untuk SEO?**
Keduanya sama-sama mengirim HTML penuh ke crawler dengan kecepatan CDN, jadi crawlability-nya identik. Pilih SSG kalau konten berubah lewat proses deploy; pilih ISR kalau konten berubah berkala (harga produk, index berita) dan ingin menghindari rebuild seluruh situs setiap ada perubahan.

**Apakah Turbopack berdampak langsung ke SEO?**
Tidak langsung — Turbopack adalah bundler build/dev, bukan runtime. Manfaatnya tidak langsung: build lokal & CI lebih cepat, revalidation ISR lebih cepat, sehingga perbaikan performa bisa di-ship lebih cepat.

---

### Sumber referensi
- Dokumentasi resmi Next.js — Metadata & OG Images (`nextjs.org/docs/app/getting-started/metadata-and-og-images`)
- App SEO — *Next.js SEO Guide for 2026: App Router, Metadata API, and Core Web Vitals*
- Vercel Docs — *Open Graph (OG) Image Generation*
- Google Search Central — *Googlebot's JavaScript processing*
