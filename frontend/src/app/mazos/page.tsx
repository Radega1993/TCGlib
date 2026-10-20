import { Suspense } from "react";
import { DeckIndex } from "@/components/deck-index";

export default function MazosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <DeckIndex searchParams={searchParams} />
    </Suspense>
  );
}
