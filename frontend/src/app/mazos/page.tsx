import { Suspense } from "react";
import { DeckIndex } from "@/components/deck-index";

export default function MazosPage() {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <DeckIndex />
    </Suspense>
  );
}
