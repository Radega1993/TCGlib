import { Suspense } from "react";
import { ProductView } from "@/components/product-view";

export default function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ externalId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="h-80 rounded-2xl bg-stone-200" />}>
      <ProductView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
