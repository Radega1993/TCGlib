import { notFound } from "next/navigation";
import { Filters } from "@/components/filters";
import { LibraryList } from "@/components/library-list";
import { Pagination } from "@/components/pagination";
import { activeFilterCount, parseShareQuery, shareHref } from "@/lib/catalog-query";
import { collectionLabel, formatCount } from "@/lib/format";
import { getSharedCollection } from "@/lib/session";
import { LibraryEntry, SharedCollection, ShareView } from "@/lib/types";

export async function PublicCollection({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseShareQuery(await searchParams);
  let collection: Awaited<ReturnType<typeof getSharedCollection>>;
  try {
    collection = await getSharedCollection(slug, query);
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudo cargar esta colección.
      </p>
    );
  }
  if (!collection) notFound();

  const back = shareHref(slug, query);
  const filtered = activeFilterCount(query) > 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        {collection.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={collection.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="size-12 rounded-full object-cover"
          />
        ) : null}
        <div>
          <p className="text-sm text-stone-500">{publicEyebrow(collection.scope)}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
            {collection.name}
          </h1>
          <p className="mt-1 text-sm text-stone-600">{publicSummary(collection)}</p>
        </div>
      </div>
      <Filters
        sets={collection.sets}
        facets={collection.facets}
        query={query}
        share={{ slug, wantedPage: query.wantedPage }}
      />
      <PublicList
        title={publicTitle(collection.scope)}
        list={collection.scope === "wanted" ? "wanted" : "owned"}
        entries={publicEntries(collection)}
        total={publicPage(collection).total}
        copies={publicPage(collection).copies}
        page={publicPage(collection).page}
        limit={publicPage(collection).limit}
        filtered={filtered}
        term={query.q}
        returnTo={back}
        empty={publicEmpty(collection.scope)}
        copiesLabel={
          collection.scope === "trades"
            ? (quantity) => `${quantity} ${quantity === 1 ? "disponible" : "disponibles"}`
            : undefined
        }
        hrefFor={(page) => shareHref(slug, { ...query, page })}
      />
    </div>
  );
}

function publicEyebrow(scope: ShareView) {
  if (scope === "wanted") return "Deseados públicos · One Piece";
  if (scope === "trades") return "Intercambio público · One Piece";
  return "Biblioteca pública · One Piece";
}

function publicTitle(scope: ShareView) {
  if (scope === "wanted") return "Deseados";
  if (scope === "trades") return "Intercambio";
  return "Biblioteca";
}

function publicEmpty(scope: ShareView) {
  if (scope === "wanted") return "Esta lista de deseos está vacía.";
  if (scope === "trades") return "No hay cartas disponibles para intercambio.";
  return "Esta biblioteca no tiene cartas.";
}

function publicPage(collection: SharedCollection) {
  const page =
    collection.scope === "wanted"
      ? collection.wanted
      : collection.scope === "trades"
        ? collection.trades
        : collection.owned;
  return page ?? { total: 0, copies: 0, page: 1, limit: 24, entries: [] };
}

function publicEntries(collection: SharedCollection) {
  return publicPage(collection).entries;
}

function publicSummary(collection: SharedCollection) {
  if (collection.scope === "trades") {
    return tradeSummary(collection.counts.trades.cards, collection.counts.trades.copies);
  }
  if (collection.scope === "wanted") {
    return `Deseados ${collectionLabel(collection.counts.wanted.cards, collection.counts.wanted.copies)}`;
  }
  return `Biblioteca ${collectionLabel(collection.counts.owned.cards, collection.counts.owned.copies)}`;
}

function tradeSummary(cards: number, copies: number) {
  const cardLabel = cards === 1 ? "carta" : "cartas";
  const copyLabel = copies === 1 ? "disponible" : "disponibles";
  return `${formatCount(cards)} ${cardLabel} · ${formatCount(copies)} ${copyLabel}`;
}

function PublicList({
  title,
  list,
  entries,
  total,
  copies,
  page,
  limit,
  filtered,
  term,
  returnTo,
  hrefFor,
  empty,
  copiesLabel,
}: {
  title: string;
  list: "owned" | "wanted";
  entries: LibraryEntry[];
  total: number;
  copies: number;
  page: number;
  limit: number;
  filtered: boolean;
  term?: string;
  returnTo: string;
  hrefFor: (page: number) => string;
  empty?: string;
  copiesLabel?: (quantity: number) => string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
        <p className="text-sm text-stone-600">
          {copiesLabel ? tradeSummary(total, copies) : collectionLabel(total, copies)}
          {term ? ` para “${term}”` : ""}
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-stone-600 ring-1 ring-stone-200">
          {filtered
            ? "Ninguna carta coincide con estos filtros."
            : empty
              ? empty
              : list === "owned"
                ? "Esta biblioteca no tiene cartas."
                : "Esta lista de deseos está vacía."}
        </p>
      ) : (
        <LibraryList
          entries={entries}
          list={list}
          readOnly={true}
          returnTo={returnTo}
          copiesLabel={copiesLabel}
        />
      )}
      {total > limit ? (
        <Pagination
          page={page}
          total={total}
          limit={limit}
          hrefFor={hrefFor}
          label={`Paginación de ${title.toLowerCase()}`}
        />
      ) : null}
    </section>
  );
}
