import { Suspense } from "react";
import { TradeView } from "@/components/trade-view";

export default function IntercambioPage() {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <TradeView />
    </Suspense>
  );
}
