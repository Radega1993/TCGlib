import { Suspense } from "react";
import { PublicDeckView } from "@/components/public-deck";
import { getPublicDeck } from "@/lib/deck";
import { notFound } from "next/navigation";

export default function PublicDeckPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <PublicDeckSlot params={params} />
    </Suspense>
  );
}

async function PublicDeckSlot({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let deck: Awaited<ReturnType<typeof getPublicDeck>>;
  try {
    deck = await getPublicDeck(slug);
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudo cargar este mazo.
      </p>
    );
  }
  if (!deck) notFound();
  return <PublicDeckView deck={deck} />;
}
