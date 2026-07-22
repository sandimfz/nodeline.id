import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
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

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "Nodeline - %s",
    default: "Nodeline - Beranda",
  },
  description: "Nodeline semua kebutuhan dalam satu platform.",
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
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
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
