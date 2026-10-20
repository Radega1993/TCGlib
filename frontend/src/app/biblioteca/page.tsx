import { Suspense } from "react";
import { CollectionView } from "@/components/collection-view";

export default function BibliotecaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <CollectionView list="owned" searchParams={searchParams} />
    </Suspense>
  );
}
