import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SuggestedWishlist } from "@/components/suggested-wishlist";
import { adoptSuggestedDeck } from "@/lib/deck-actions";
import { getSuggestion } from "@/lib/deck";
import { formatCount } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { productHref } from "@/lib/catalog-query";

export async function SuggestedDeckView({
  slug,
  back,
}: {
  slug: string;
  back: string;
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?return=${encodeURIComponent(`/mazos/sugeridos/${slug}`)}`);
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();

  let deck: Awaited<ReturnType<typeof getSuggestion>>;
  try {
    deck = await getSuggestion(slug);
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudo cargar el mazo. Comprueba que la API sigue en marcha.
      </p>
    );
  }
  if (!deck) notFound();

  const missing = deck.lines.filter((line) => line.missing > 0);

  return (
    <div className="flex flex-col gap-4">
      <Link href={back} className="text-sm font-medium text-stone-600">
        Mazos
      </Link>
      <div className="flex gap-3">
        <span className="relative block h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100">
          {deck.leader?.image ? (
            <Image src={deck.leader.image} alt="" fill sizes="80px" className="object-contain" />
          ) : null}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-stone-500">Recomendado · {deck.author}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">{deck.name}</h1>
          <p className="mt-1 truncate text-sm text-stone-600">
            {deck.leader ? `${deck.leader.code} · ${deck.leader.name}` : "Sin líder"}
          </p>
          <p className="mt-2 text-sm font-medium text-stone-800">
            {deck.missingCopies === 0
              ? "Puedes jugarlo"
              : `Te faltan ${formatCount(deck.missingCopies)} copias`}
            {" · "}
            Disponibles {deck.available}/{deck.listSize}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <SuggestedWishlist slug={deck.slug} missing={deck.missingCopies} />
        {deck.deckId ? (
          <Link
            href={`/mazos/${deck.deckId}`}
            className="inline-flex h-11 items-center rounded-xl bg-white px-3 text-sm font-medium text-stone-900 ring-1 ring-stone-300"
          >
            Ver en mis mazos
          </Link>
        ) : (
          <form action={adoptSuggestedDeck.bind(null, deck.slug)}>
            <button
              type="submit"
              className="inline-flex h-11 items-center rounded-xl bg-white px-3 text-sm font-medium text-stone-900 ring-1 ring-stone-300"
            >
              Crear en mis mazos
            </button>
          </form>
        )}
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-stone-900">Te falta</h2>
        {missing.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-600 ring-1 ring-stone-200">
            Tienes todas las cartas de esta lista.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 lg:grid-cols-4">
            {missing.map((line) => (
              <li key={line.code}>
                <Link
                  href={line.externalId ? productHref(line.externalId, `/mazos/sugeridos/${deck.slug}`) : `/mazos/sugeridos/${deck.slug}`}
                  className="block overflow-hidden rounded-xl bg-white ring-1 ring-stone-200"
                >
                  <span className="relative block aspect-[63/88] bg-stone-100">
                    {line.image ? (
                      <Image src={line.image} alt="" fill sizes="(min-width: 1024px) 180px, 33vw" className="object-contain" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-stone-500">
                        {line.name}
                      </span>
                    )}
                    <span className="absolute right-1 bottom-1 rounded-full bg-stone-950/85 px-1.5 py-0.5 text-xs font-semibold text-white">
                      Faltan {formatCount(line.missing)}
                    </span>
                  </span>
                  <span className="block px-2 py-2">
                    <span className="block truncate text-xs font-medium text-stone-950">{line.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-stone-500">
                      {line.code}
                      {line.leader ? " · Líder" : ""}
                      {" · "}
                      Tengo {formatCount(line.owned)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
