import { Suspense } from "react";
import { ProgressSetView } from "@/components/progress-set-view";

export default function RiftboundProgresoSetPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <ProgressSetView params={params} searchParams={searchParams} game="riftbound" />
    </Suspense>
  );
}
