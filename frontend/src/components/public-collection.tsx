import Link from "next/link";
import { notFound } from "next/navigation";
import { Filters } from "@/components/filters";
import { LibraryAlbum } from "@/components/library-album";
import { LibraryList } from "@/components/library-list";
import { Pagination } from "@/components/pagination";
import { activeFilterCount, parseShareQuery, shareHref } from "@/lib/catalog-query";
import { collectionLabel, formatCount } from "@/lib/format";
import { gameProfile, GameSlug } from "@/lib/games";
import { getSharedCollection } from "@/lib/session";
import { LibraryEntry, SharedCollection, ShareLayout, ShareTab } from "@/lib/types";

const TABS: { id: ShareTab; label: string }[] = [
  { id: "biblioteca", label: "Biblioteca" },
  { id: "intercambio", label: "Intercambio" },
  { id: "busco", label: "Busco" },
];

export async function PublicCollection({
  slug,
  searchParams,
  game = "one-piece",
}: {
  slug: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  game?: GameSlug;
}) {
  const profile = gameProfile(game);
  const query = parseShareQuery(await searchParams);
  let collection: Awaited<ReturnType<typeof getSharedCollection>>;
  try {
    collection = await getSharedCollection(slug, query, profile.slug);
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudo cargar esta colección.
      </p>
    );
  }
  if (!collection) notFound();

  const active = collection.tab;
  const view = query.view === "list" ? "list" : "album";
  const back = shareHref(slug, { ...query, tab: active, view }, profile.slug);
  const filtered = activeFilterCount(query) > 0;
  const page = publicPage(collection);

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
          <p className="text-sm text-stone-500">Colección pública · {profile.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
            {collection.name}
          </h1>
        </div>
      </div>
      <nav aria-label="Listas" className="flex gap-2">
        {TABS.map((tab) => {
          const current = tab.id === active;
          const count = tabCount(collection, tab.id);
          return (
            <Link
              key={tab.id}
              href={shareHref(slug, { ...query, tab: tab.id, view, page: 1 }, profile.slug)}
              aria-current={current ? "page" : undefined}
              className={`inline-flex h-11 flex-1 items-center justify-center rounded-xl px-2 text-sm font-medium ${
                current
                  ? "bg-white text-stone-950 ring-1 ring-stone-200"
                  : "text-stone-600"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 tabular-nums text-stone-500">{formatCount(count)}</span>
            </Link>
          );
        })}
      </nav>
      <Filters
        sets={collection.sets}
        facets={collection.facets}
        query={query}
        share={{ slug, tab: active, view }}
        shareGame={profile.slug}
        tcg={profile.slug}
        catalogBase={profile.base || "/"}
        productBase={profile.productBase}
        searchPlaceholder={profile.searchPlaceholder}
        colorLabelText={profile.colorLabelText}
        attributeLabelText={profile.attributeLabelText}
        costLabelText={profile.costLabelText}
        setLabelText={profile.setLabelText}
        setPlaceholder={profile.setPlaceholder}
        editionSortLabel={profile.editionSortLabel}
        colorSortLabel={profile.colorSortLabel}
      />
      <PublicList
        title={publicTitle(active)}
        list={active === "busco" ? "wanted" : "owned"}
        entries={page.entries}
        total={page.total}
        copies={page.copies}
        page={page.page}
        limit={page.limit}
        filtered={filtered}
        term={query.q}
        returnTo={back}
        empty={publicEmpty(active)}
        copiesLabel={
          active === "intercambio"
            ? (quantity) => `${quantity} ${quantity === 1 ? "disponible" : "disponibles"}`
            : undefined
        }
        hrefFor={(nextPage) =>
          shareHref(slug, { ...query, tab: active, view, page: nextPage }, profile.slug)
        }
        view={view}
        viewHref={(next) => shareHref(slug, { ...query, tab: active, view: next }, profile.slug)}
        productBase={profile.productBase}
      />
    </div>
  );
}

function tabCount(collection: SharedCollection, tab: ShareTab) {
  if (tab === "intercambio") return collection.counts.trades.cards;
  if (tab === "busco") return collection.counts.wanted.cards;
  return collection.counts.owned.cards;
}

function publicTitle(tab: ShareTab) {
  if (tab === "busco") return "Busco";
  if (tab === "intercambio") return "Intercambio";
  return "Biblioteca";
}

function publicEmpty(tab: ShareTab) {
  if (tab === "busco") return "No busca ninguna carta.";
  if (tab === "intercambio") return "No hay cartas disponibles para intercambio.";
  return "Esta biblioteca no tiene cartas.";
}

function publicPage(collection: SharedCollection) {
  const page =
    collection.tab === "busco"
      ? collection.wanted
      : collection.tab === "intercambio"
        ? collection.trades
        : collection.owned;
  return page ?? { total: 0, copies: 0, page: 1, limit: 24, entries: [] };
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
  view,
  viewHref,
  productBase,
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
  view: ShareLayout;
  viewHref: (view: ShareLayout) => string;
  productBase: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
          <p className="text-sm text-stone-600">
            {copiesLabel ? tradeSummary(total, copies) : collectionLabel(total, copies)}
            {term ? ` para “${term}”` : ""}
          </p>
        </div>
        <PublicViewToggle view={view} hrefFor={viewHref} />
      </div>
      {entries.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-stone-600 ring-1 ring-stone-200">
          {filtered ? "Ninguna carta coincide con estos filtros." : empty}
        </p>
      ) : view === "album" ? (
        <LibraryAlbum entries={entries} returnTo={returnTo} productBase={productBase} />
      ) : (
        <LibraryList
          entries={entries}
          list={list}
          readOnly={true}
          returnTo={returnTo}
          copiesLabel={copiesLabel}
          productBase={productBase}
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

const PUBLIC_VIEWS: { id: ShareLayout; label: string }[] = [
  { id: "album", label: "Álbum" },
  { id: "list", label: "Lista" },
];

function PublicViewToggle({
  view,
  hrefFor,
}: {
  view: ShareLayout;
  hrefFor: (view: ShareLayout) => string;
}) {
  return (
    <div
      className="flex shrink-0 rounded-xl bg-white p-1 ring-1 ring-stone-200"
      role="group"
      aria-label="Vista de la colección"
    >
      {PUBLIC_VIEWS.map((option) => {
        const selected = option.id === view;
        return (
          <Link
            key={option.id}
            href={hrefFor(option.id)}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex h-11 items-center rounded-lg px-3 text-sm font-medium ${
              selected ? "bg-stone-900 text-white" : "text-stone-600"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

function tradeSummary(cards: number, copies: number) {
  const cardLabel = cards === 1 ? "carta" : "cartas";
  const copyLabel = copies === 1 ? "disponible" : "disponibles";
  return `${formatCount(cards)} ${cardLabel} · ${formatCount(copies)} ${copyLabel}`;
}
