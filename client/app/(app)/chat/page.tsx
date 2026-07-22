import type { Metadata } from "next";
import { cookies } from "next/headers";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { fetchMeServer, SESSION_COOKIE } from "@/lib/bff-server";
import { queryKeys } from "@/lib/query-keys";
import { ChatPageClient } from "./chat-client";

export const metadata: Metadata = {
  title: "Chat",
};

export default async function ChatPage() {
  const queryClient = getQueryClient();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionToken) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.auth.me,
      queryFn: () => fetchMeServer(sessionToken),
      staleTime: 5 * 60 * 1000,
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ChatPageClient />
    </HydrationBoundary>
  );
}
