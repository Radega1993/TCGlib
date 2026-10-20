import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Filters } from "@/components/filters";
import { LibraryAlbum } from "@/components/library-album";
import { LibraryList } from "@/components/library-list";
import { LibraryLayout, LibraryViewToggle } from "@/components/library-view-toggle";
import { Pagination } from "@/components/pagination";
import { activeFilterCount, libraryHref, parseCatalogQuery } from "@/lib/catalog-query";
import { collectionLabel, formatCount } from "@/lib/format";
import { getCurrentUser, getLibrary } from "@/lib/session";
import { LibraryList as LibraryName } from "@/lib/types";

export async function CollectionView({
  list,
  searchParams,
}: {
  list: LibraryName;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseCatalogQuery(await searchParams);
  const returnTo = libraryHref(list, query);
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?return=${encodeURIComponent(returnTo)}`);

  let library: Awaited<ReturnType<typeof getLibrary>>;
  try {
    library = await getLibrary(list, query);
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudo cargar tu lista. Comprueba que la API sigue en marcha.
      </p>
    );
  }
  if (!library) redirect(`/entrar?return=${encodeURIComponent(returnTo)}`);

  const summary = library.counts[list];
  const title = list === "owned" ? "Biblioteca" : "Deseados";
  const layout = list === "owned" ? await libraryLayout() : "list";
  const filtered = activeFilterCount(query) > 0;
  const hasCards = summary.cards > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">One Piece</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">
            {title}
          </h1>
        </div>
        {list === "owned" && hasCards ? <LibraryViewToggle view={layout} /> : null}
      </div>
      <div>
        <p className="text-sm text-stone-700">{collectionLabel(summary.cards, summary.copies)}</p>
        {list === "owned" && library.counts.trades.copies > 0 ? (
          <p className="mt-1 text-sm text-stone-500">
            {formatCount(Math.max(0, summary.copies - library.counts.trades.copies))} reservadas y{" "}
            {formatCount(library.counts.trades.copies)} en intercambio. El total las incluye.
          </p>
        ) : null}
      </div>
      <Filters sets={library.sets} facets={library.facets} query={query} list={list} />
      {filtered ? (
        <p className="text-sm text-stone-700">
          {collectionLabel(library.total, library.copies)}
          {query.q ? ` para “${query.q}”` : ""}
        </p>
      ) : null}
      {library.data.length === 0 ? (
        filtered ? (
          <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-stone-600 ring-1 ring-stone-200">
            Ninguna carta coincide con estos filtros.
          </p>
        ) : (
          <LibraryList entries={library.data} list={list} returnTo={returnTo} />
        )
      ) : layout === "album" ? (
        <LibraryAlbum entries={library.data} returnTo={returnTo} />
      ) : (
        <LibraryList entries={library.data} list={list} returnTo={returnTo} />
      )}
      {library.total > library.limit ? (
        <Pagination
          page={library.page}
          total={library.total}
          limit={library.limit}
          hrefFor={(page) => libraryHref(list, query, page)}
          label={`Paginación de ${title.toLowerCase()}`}
        />
      ) : null}
    </div>
  );
}

async function libraryLayout(): Promise<LibraryLayout> {
  const jar = await cookies();
  return jar.get("tcglib_library_view")?.value === "album" ? "album" : "list";
}
