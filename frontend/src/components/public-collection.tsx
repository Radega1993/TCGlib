import { notFound } from "next/navigation";
import { Filters } from "@/components/filters";
import { LibraryList } from "@/components/library-list";
import { Pagination } from "@/components/pagination";
import { activeFilterCount, parseShareQuery, shareHref } from "@/lib/catalog-query";
import { collectionLabel } from "@/lib/format";
import { getSharedCollection } from "@/lib/session";
import { LibraryEntry } from "@/lib/types";

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
          <p className="text-sm text-stone-500">Colección pública · One Piece</p>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
            {collection.name}
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Biblioteca {collectionLabel(collection.counts.owned.cards, collection.counts.owned.copies)}
            {" · "}
            Deseados {collectionLabel(collection.counts.wanted.cards, collection.counts.wanted.copies)}
          </p>
        </div>
      </div>
      <Filters
        sets={collection.sets}
        facets={collection.facets}
        query={query}
        share={{ slug, wantedPage: query.wantedPage }}
      />
      <PublicList
        title="Biblioteca"
        list="owned"
        entries={collection.owned.entries}
        total={collection.owned.total}
        copies={collection.owned.copies}
        page={collection.owned.page}
        limit={collection.owned.limit}
        filtered={filtered}
        term={query.q}
        returnTo={back}
        hrefFor={(page) => shareHref(slug, { ...query, page })}
      />
      <PublicList
        title="Deseados"
        list="wanted"
        entries={collection.wanted.entries}
        total={collection.wanted.total}
        copies={collection.wanted.copies}
        page={collection.wanted.page}
        limit={collection.wanted.limit}
        filtered={filtered}
        term={query.q}
        returnTo={back}
        hrefFor={(wantedPage) => shareHref(slug, { ...query, wantedPage })}
      />
    </div>
  );
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
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
        <p className="text-sm text-stone-600">
          {collectionLabel(total, copies)}
          {term ? ` para “${term}”` : ""}
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-stone-600 ring-1 ring-stone-200">
          {filtered
            ? "Ninguna carta coincide con estos filtros."
            : list === "owned"
              ? "Esta biblioteca no tiene cartas."
              : "Esta lista de deseos está vacía."}
        </p>
      ) : (
        <LibraryList entries={entries} list={list} readOnly={true} returnTo={returnTo} />
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
