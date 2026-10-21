import { Suspense } from "react";
import {
  CatalogBrowser,
  CatalogSkeleton,
} from "@/components/catalog-browser";

export default function RiftboundPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogBrowser
        searchParams={searchParams}
        tcg="riftbound"
        base="/riftbound"
        title="Riftbound"
      />
    </Suspense>
  );
}
