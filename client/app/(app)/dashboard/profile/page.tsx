import type { Metadata } from "next";
import { cookies } from "next/headers";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { fetchMeServer, SESSION_COOKIE } from "@/lib/bff-server";
import { queryKeys } from "@/lib/query-keys";
import ProfilePage from "./profile-content";

export const metadata: Metadata = {
  title: "Profil",
};

export default async function ProfilePageWrapper() {
  const queryClient = getQueryClient();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  // Prefetch user data server-side agar cache TanStack Query langsung terisi
  if (sessionToken) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.auth.me,
      queryFn: () => fetchMeServer(sessionToken),
      staleTime: 5 * 60 * 1000,
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfilePage />
    </HydrationBoundary>
  );
}
