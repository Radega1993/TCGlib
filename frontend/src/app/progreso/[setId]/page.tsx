import { Suspense } from "react";
import { ProgressSetView } from "@/components/progress-set-view";

export default function ProgresoSetPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <ProgressSetView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
