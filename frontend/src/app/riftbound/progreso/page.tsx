import { Suspense } from "react";
import { ProgressView } from "@/components/progress-view";

export default function RiftboundProgresoPage() {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <ProgressView game="riftbound" />
    </Suspense>
  );
}
