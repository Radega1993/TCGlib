import { Suspense } from "react";
import { TradeView } from "@/components/trade-view";

export default function IntercambioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <TradeView searchParams={searchParams} />
    </Suspense>
  );
}
