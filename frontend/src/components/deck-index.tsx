import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeckImport } from "@/components/deck-import";
import { createDeck } from "@/lib/deck-actions";
import { formatName, legalityTitle } from "@/lib/deck-copy";
import { getDecks, getSuggestions } from "@/lib/deck";
import { getCurrentUser } from "@/lib/session";
import { SuggestedDeckList } from "@/components/suggested-deck-list";
import { parseSuggestionQuery } from "@/lib/suggestion-query";

export async function DeckIndex({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?return=/mazos");
  const suggestionQuery = parseSuggestionQuery(await searchParams);

  let decks: Awaited<ReturnType<typeof getDecks>>;
  let suggestions: Awaited<ReturnType<typeof getSuggestions>> = [];
  try {
    [decks, suggestions] = await Promise.all([
      getDecks(),
      getSuggestions().then((items) => items ?? []),
    ]);
  } catch {
    return <DeckError />;
  }
  if (!decks) redirect("/entrar?return=/mazos");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <p className="text-sm text-stone-500">One Piece</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">Mazos</h1>
        </div>
        <DeckImport />
        <form action={createDeck}>
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white"
          >
            Crear mazo
          </button>
        </form>
      </div>
      <h2 className="text-sm font-semibold text-stone-900">Tus mazos</h2>
      {decks.length === 0 ? (
        <div className="rounded-2xl bg-white px-4 py-10 text-center ring-1 ring-stone-200">
          <p className="text-sm text-stone-700">Todavía no tienes mazos.</p>
          <p className="mt-1 text-sm text-stone-500">
            Elige un líder y arma una lista de 50 cartas.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {decks.map((deck) => (
            <li key={deck.id}>
              <Link
                href={`/mazos/${deck.id}`}
                className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-200"
              >
                <span className="relative block h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                  {deck.leader?.image ? (
                    <Image src={deck.leader.image} alt="" fill sizes="64px" className="object-contain" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-stone-950">{deck.name}</span>
                  <span className="mt-1 block truncate text-xs text-stone-500">
                    {deck.leader ? `${deck.leader.code} · ${deck.leader.name}` : "Sin líder"}
                    {" · "}
                    {formatName(deck.format)}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-700">
                    <span>
                      Lista {deck.construction.size}/{deck.construction.target}
                    </span>
                    <span>
                      Disponibles {deck.availability.available}/{deck.availability.listSize}
                    </span>
                    <span>{deck.construction.ok ? "Construcción válida" : "Construcción incompleta"}</span>
                    <span>{legalityTitle(deck.legality.status)}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <SuggestedDeckList decks={suggestions ?? []} query={suggestionQuery} />
    </div>
  );
}

function DeckError() {
  return (
    <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
      No se pudieron cargar tus mazos. Comprueba que la API sigue en marcha.
    </p>
  );
}
