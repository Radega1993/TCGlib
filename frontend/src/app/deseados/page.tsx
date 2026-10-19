import { Suspense } from "react";
import { CollectionView } from "@/components/collection-view";

export default function DeseadosPage() {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <CollectionView list="wanted" />
    </Suspense>
  );
}
