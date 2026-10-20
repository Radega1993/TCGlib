import { Suspense } from "react";
import { PlayerDirectory } from "@/components/player-directory";

export default function JugadoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <PlayerDirectory searchParams={searchParams} />
    </Suspense>
  );
}
