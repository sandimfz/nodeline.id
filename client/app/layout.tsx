import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { dehydrate } from "@tanstack/react-query";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Providers } from "./providers";
import { AuthInit } from "@/components/auth/auth-init";
import { ToastProvider } from "@/lib/toast";
import { getQueryClient } from "@/lib/get-query-client";
import { fetchMeServer, SESSION_COOKIE } from "@/lib/bff-server";
import { queryKeys } from "@/lib/query-keys";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.sandimf.dev";

export const metadata: Metadata = {
  // Required so relative URLs (canonical, OG images) resolve to absolute ones.
  // Without this, social previews break and AI crawlers may skip images.
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | Nodeline",
    default: "Nodeline — Satu Platform untuk Semua Kebutuhan",
  },
  description:
    "Marketplace produk digital dan API Directory. Beli produk digital dengan aman, atau gunakan API trading dan data pasar real-time untuk project kamu.",
  applicationName: "Nodeline",
  keywords: [
    "marketplace digital",
    "produk digital",
    "api directory",
    "api trading",
    "market data api",
    "forex api",
  ],
  authors: [{ name: "Nodeline" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Nodeline",
    title: "Nodeline — Satu Platform untuk Semua Kebutuhan",
    description:
      "Marketplace produk digital dan API Directory. Beli produk digital dengan aman, atau gunakan API trading dan data pasar real-time.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nodeline — Satu Platform untuk Semua Kebutuhan",
    description:
      "Marketplace produk digital dan API Directory untuk kebutuhan project kamu.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // --- Server-side prefetch: baca session cookie & pre-cache user data ---
  const queryClient = getQueryClient();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionToken) {
    // Pre-cache user data so the client doesn't flash "guest" state
    await queryClient.prefetchQuery({
      queryKey: queryKeys.auth.me,
      queryFn: () => fetchMeServer(sessionToken),
      staleTime: 5 * 60 * 1000,
    });
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <html
      lang="id"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
      )}
      suppressHydrationWarning
    >
      <body>
        <Providers dehydratedState={dehydratedState}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthInit />
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
