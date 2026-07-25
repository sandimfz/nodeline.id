"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/features/auth/types";

export default function GoogleCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("Missing authorization code");
      return;
    }

    fetch(`/api/v1/bff/auth/oauth/google/callback?code=${encodeURIComponent(code)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { message?: string }).message ?? "Login gagal");
        }
        return res.json();
      })
      .then((data: { user: User; accessToken: string }) => {
        setSession(data.accessToken, data.user);
        router.replace("/dashboard");
      })
      .catch((err: Error) => {
        setError(err.message);
      });
  }, [searchParams, router, setSession]);

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-medium">{error}</p>
          <a href="/auth/login" className="mt-2 text-sm text-muted-foreground hover:text-foreground">
            Kembali ke login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner />
        <p className="text-sm text-muted-foreground">Memproses login...</p>
      </div>
    </div>
  );
}
