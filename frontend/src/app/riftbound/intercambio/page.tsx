import { Suspense } from "react";
import { TradeView } from "@/components/trade-view";

export default function RiftboundIntercambioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <TradeView searchParams={searchParams} game="riftbound" />
    </Suspense>
  );
}
