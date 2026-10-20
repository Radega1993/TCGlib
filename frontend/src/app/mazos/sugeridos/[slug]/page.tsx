import { Suspense } from "react";
import { SuggestedDeckView } from "@/components/suggested-deck-view";
import { safeNextPath } from "@/lib/catalog-query";

export default function SuggestedDeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <SuggestedSlot params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function SuggestedSlot({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const origen = first(query.origen);
  const back = origen.startsWith("/mazos")
    ? safeNextPath(origen, "/mazos#recomendados")
    : "/mazos#recomendados";
  return <SuggestedDeckView slug={slug} back={back} />;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
