import { Suspense } from "react";
import { ProgressView } from "@/components/progress-view";

export default function ProgresoPage() {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <ProgressView />
    </Suspense>
  );
}
