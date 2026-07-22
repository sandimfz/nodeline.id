import { fetchProductsServer } from "@/lib/bff-server";
import { CardProductShowcasePage } from "@/components/marketplace/card-product";

export const metadata = {
  title: "Marketplace",
};

export default async function Marketplace() {
  const products = await fetchProductsServer();
  return <CardProductShowcasePage products={products} />;
}
