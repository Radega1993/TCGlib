import { Suspense } from "react";
import { DeckEditor } from "@/components/deck-editor";
import { getDeck } from "@/lib/deck";
import { getCurrentUser } from "@/lib/session";
import { notFound, redirect } from "next/navigation";

export default function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-stone-200" />}>
      <DeckSlot params={params} />
    </Suspense>
  );
}

async function DeckSlot({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?return=${encodeURIComponent(`/mazos/${id}`)}`);

  let deck: Awaited<ReturnType<typeof getDeck>>;
  try {
    deck = await getDeck(id);
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudo cargar el mazo. Comprueba que la API sigue en marcha.
      </p>
    );
  }
  if (!deck) notFound();
  return <DeckEditor deck={deck} />;
}
