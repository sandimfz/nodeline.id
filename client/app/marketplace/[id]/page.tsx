import { notFound } from "next/navigation";
import { fetchProductServer } from "@/lib/bff-server";
import { ProductDetailPage } from "./product-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const product = await fetchProductServer(id);
  if (!product) return { title: "Produk Tidak Ditemukan" };
  return {
    title: product.name,
    description: product.description ?? `Rp ${product.priceCents.toLocaleString("id-ID")}`,
  };
}

export default async function ProductDetail({ params }: Props) {
  const { id } = await params;
  const product = await fetchProductServer(id);
  if (!product) notFound();

  return <ProductDetailPage product={product} />;
}
