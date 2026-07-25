import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";
import { fetchProductsServer } from "@/lib/bff-server";
import { CardProductShowcasePage } from "@/components/marketplace/card-product";

export const metadata = {
  title: "Marketplace",
};

export default async function Marketplace() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.marketplace.products.list(),
    queryFn: () => fetchProductsServer(),
    staleTime: 60_000,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CardProductShowcasePage />
    </HydrationBoundary>
  );
}
