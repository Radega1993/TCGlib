"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CardSearch } from "@/components/card-search";
import {
  catalogHref,
  libraryHref,
  shareHref,
  toggleValue,
} from "@/lib/catalog-query";
import {
  attributeLabel,
  cardTypeLabel,
  colorClass,
  colorLabel,
  rarityLabel,
} from "@/lib/format";
import {
  CardSet,
  CatalogFacets,
  CatalogQuery,
  CatalogSort,
  LibraryList,
  ShareLayout,
  ShareTab,
} from "@/lib/types";

const SORTS: { id: CatalogSort; label: string }[] = [
  { id: "set", label: "Ediciones" },
  { id: "color", label: "Colores" },
  { id: "rarity", label: "Rareza" },
];

export function Filters({
  sets,
  facets,
  query,
  share,
  list,
}: {
  sets: CardSet[];
  facets: CatalogFacets;
  query: CatalogQuery;
  share?: { slug: string; tab: ShareTab; view?: ShareLayout };
  list?: LibraryList;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState(query.q ?? "");
  const [seenQ, setSeenQ] = useState(query.q);
  const [open, setOpen] = useState(false);

  if (seenQ !== query.q) {
    setSeenQ(query.q);
    setText(query.q ?? "");
  }

  const selected =
    query.color.length +
    query.rarity.length +
    query.cardType.length +
    query.attribute.length +
    query.cost.length +
    (query.set ? 1 : 0);

  function destination(next: CatalogQuery) {
    if (share) return shareHref(share.slug, { ...next, tab: share.tab, view: share.view });
    if (list) return libraryHref(list, next);
    return catalogHref(next);
  }

  function apply(patch: Partial<CatalogQuery> = {}) {
    const next: CatalogQuery = {
      ...query,
      ...patch,
      q: text.trim() || undefined,
      page: 1,
    };
    startTransition(() => {
      router.push(destination(next));
    });
  }

  function clear() {
    setText("");
    startTransition(() => {
      router.push(
        destination({
          color: [],
          rarity: [],
          cardType: [],
          attribute: [],
          cost: [],
          sort: query.sort,
          page: 1,
        }),
      );
    });
  }

  return (
    <section
      aria-busy={isPending}
      className="flex flex-col gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-200 sm:p-4"
    >
      <CardSearch
        query={query}
        text={text}
        onTextChange={setText}
        onSearch={() => apply()}
        suggestionHref={
          share || list
            ? (suggestion) =>
                destination({
                  ...query,
                  q: suggestion.code ?? suggestion.name,
                  page: 1,
                })
            : undefined
        }
      />
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-stone-500">Orden</span>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Orden">
          {SORTS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={query.sort === option.id}
              onClick={() => apply({ sort: option.id })}
              className={`inline-flex h-11 items-center justify-center rounded-xl px-2 text-sm font-medium ${
                query.sort === option.id
                  ? "bg-stone-900 text-white"
                  : "bg-stone-50 text-stone-800 ring-1 ring-stone-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-stone-100 px-3 text-sm font-medium text-stone-800"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Filtros
        {selected > 0 ? (
          <span className="rounded-full bg-stone-900 px-2 py-0.5 text-xs text-white">
            {selected}
          </span>
        ) : null}
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`ml-auto size-5 text-stone-500 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M5 7.5 10 12.5 15 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className={`${open ? "flex" : "hidden"} flex-col gap-4`}>
        {facets.color.length > 0 ? (
        <FilterGroup label="Color" hint="incluye multicolor">
          {facets.color.map((color) => (
            <Chip
              key={color}
              pressed={query.color.includes(color)}
              onClick={() => apply({ color: toggleValue(query.color, color) })}
            >
              <span
                className={`size-3 rounded-full ring-1 ring-black/15 ${colorClass(color)}`}
              />
              {colorLabel(color)}
            </Chip>
          ))}
        </FilterGroup>
        ) : null}
        {facets.rarity.length > 0 ? (
        <FilterGroup label="Rareza">
          {facets.rarity.map((rarity) => (
            <Chip
              key={rarity}
              title={rarityLabel(rarity)}
              pressed={query.rarity.includes(rarity)}
              onClick={() => apply({ rarity: toggleValue(query.rarity, rarity) })}
            >
              {rarity}
            </Chip>
          ))}
        </FilterGroup>
        ) : null}
        {facets.cardType.length > 0 ? (
        <FilterGroup label="Tipo de carta">
          {facets.cardType.map((cardType) => (
            <Chip
              key={cardType}
              pressed={query.cardType.includes(cardType)}
              onClick={() =>
                apply({ cardType: toggleValue(query.cardType, cardType) })
              }
            >
              {cardTypeLabel(cardType)}
            </Chip>
          ))}
        </FilterGroup>
        ) : null}
        {facets.attribute.length > 0 ? (
        <FilterGroup label="Atributo">
          {facets.attribute.map((attribute) => (
            <Chip
              key={attribute}
              title={attribute}
              pressed={query.attribute.includes(attribute)}
              onClick={() =>
                apply({ attribute: toggleValue(query.attribute, attribute) })
              }
            >
              {attributeLabel(attribute)}
            </Chip>
          ))}
        </FilterGroup>
        ) : null}
        {facets.cost.length > 0 ? (
        <FilterGroup label="Coste">
          {facets.cost.map((cost) => (
            <Chip
              key={cost}
              pressed={query.cost.includes(cost)}
              onClick={() => apply({ cost: toggleValue(query.cost, cost) })}
              compact
            >
              {cost}
            </Chip>
          ))}
        </FilterGroup>
        ) : null}
        {sets.length > 0 ? (
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-500">
            Set
          </span>
          <select
            value={query.set ?? ""}
            onChange={(event) => apply({ set: event.target.value || undefined })}
            className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 outline-none ring-rose-700 focus:ring-2"
          >
            <option value="">Todos los sets</option>
            {sets.map((set) => (
              <option key={set.externalId} value={set.externalId}>
                {set.code ? `${set.code} · ${set.name}` : set.name}
              </option>
            ))}
          </select>
        </label>
        ) : null}
        {selected > 0 || query.q ? (
          <button
            type="button"
            onClick={clear}
            className="h-11 self-start rounded-xl px-3 text-sm font-medium text-stone-600 underline-offset-4 hover:underline"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>
    </section>
  );
}

function FilterGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
        {hint ? (
          <span className="ml-2 font-normal tracking-normal text-stone-400 normal-case">
            {hint}
          </span>
        ) : null}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Chip({
  pressed,
  onClick,
  title,
  compact = false,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  title?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm ${
        compact ? "min-w-11 px-2" : "px-3"
      } ${
        pressed
          ? "bg-stone-900 text-white"
          : "bg-stone-50 text-stone-800 ring-1 ring-stone-300"
      }`}
    >
      {children}
    </button>
  );
}
