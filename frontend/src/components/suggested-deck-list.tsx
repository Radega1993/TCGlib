"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Pagination } from "@/components/pagination";
import { colorClass, colorLabel, formatCount } from "@/lib/format";
import { SuggestionQuery } from "@/lib/suggestion-query";
import { SuggestedDeckMatch } from "@/lib/types";

const PAGE_SIZE = 10;
const GAPS = [
  { value: "", label: "Cualquier falta" },
  { value: "0", label: "Puedes jugarlo" },
  { value: "10", label: "Te faltan 10 o menos" },
  { value: "20", label: "Te faltan 20 o menos" },
];

export function SuggestedDeckList({
  decks,
  query: initialQuery,
}: {
  decks: SuggestedDeckMatch[];
  query: SuggestionQuery;
}) {
  const [query, setQuery] = useState(initialQuery);
  const colors = leaderColors(decks);
  const leaders = leaderOptions(decks);
  const filtered = decks.filter((deck) => matches(deck, query));
  const page = Math.min(query.page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const current = { ...query, page };
  const filtering = Boolean(query.q || query.falta || query.colors.length || query.leader);

  return (
    <section id="recomendados" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Recomendados</h2>
          <p className="mt-1 text-sm text-stone-500">
            {formatCount(filtered.length)} según tu biblioteca. Los que menos cartas te faltan salen primero.
          </p>
        </div>
        <div className="flex shrink-0 rounded-xl bg-white p-1 ring-1 ring-stone-200" role="group" aria-label="Vista de recomendados">
          {(["album", "list"] as const).map((view) => (
            <button
              key={view}
              type="button"
              aria-pressed={query.view === view}
              onClick={() => publish({ ...query, view })}
              className={`inline-flex h-11 items-center rounded-lg px-3 text-sm font-medium ${
                query.view === view ? "bg-stone-900 text-white" : "text-stone-600"
              }`}
            >
              {view === "album" ? "Álbum" : "Lista"}
            </button>
          ))}
        </div>
      </div>
      <form
        action="/mazos#recomendados"
        onSubmit={applyFilters}
        className="flex flex-col gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-200"
      >
        {query.view === "list" ? <input type="hidden" name="vista" value="lista" /> : null}
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Buscar
          <input
            name="q"
            defaultValue={query.q}
            placeholder="Nombre o autor"
            className="h-11 rounded-xl bg-stone-50 px-3 text-stone-950 ring-1 ring-stone-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Líder
          <select
            name="lider"
            defaultValue={query.leader}
            className="h-11 rounded-xl bg-stone-50 px-3 text-stone-950 ring-1 ring-stone-200"
          >
            <option value="">Todos los líderes</option>
            {leaders.map((leader) => (
              <option key={leader.code} value={leader.code}>
                {leader.name} · {leader.code}
              </option>
            ))}
          </select>
        </label>
        {colors.length > 0 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm text-stone-700">Colores</legend>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <label
                  key={color}
                  className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm ${
                    query.colors.includes(color) ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="color"
                    value={color}
                    defaultChecked={query.colors.includes(color)}
                    className="size-4 accent-stone-900"
                  />
                  <span className={`size-2.5 rounded-full ${colorClass(color)}`} />
                  {colorLabel(color)}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          Lo que te falta
          <select
            name="falta"
            defaultValue={query.falta}
            className="h-11 rounded-xl bg-stone-50 px-3 text-stone-950 ring-1 ring-stone-200"
          >
            {GAPS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white"
        >
          Filtrar
        </button>
      </form>
      {visible.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-600 ring-1 ring-stone-200">
          {decks.length === 0
            ? "Todavía no hay mazos de la comunidad. Cuando se actualicen en Administración, aparecerán aquí."
            : filtering
              ? "Ningún mazo coincide con estos filtros."
              : "Todavía no hay mazos de la comunidad. Cuando se actualicen en Administración, aparecerán aquí."}
        </p>
      ) : query.view === "album" ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((deck) => (
            <li key={deck.slug}>
              <Link
                href={detailHref(deck.slug, current)}
                className="block overflow-hidden rounded-xl bg-white ring-1 ring-stone-200"
              >
                <span className="relative block aspect-[63/88] bg-stone-100">
                  {deck.leader?.image ? (
                    <Image src={deck.leader.image} alt="" fill sizes="(min-width: 1024px) 180px, 50vw" className="object-contain" />
                  ) : null}
                  <span className="absolute right-1 bottom-1 rounded-full bg-stone-950/85 px-1.5 py-0.5 text-xs font-semibold text-white">
                    {deck.missingCopies === 0 ? "Completo" : `Faltan ${formatCount(deck.missingCopies)}`}
                  </span>
                </span>
                <span className="block px-2 py-2">
                  <span className="block truncate text-sm font-medium text-stone-950">{deck.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-stone-500">
                    {deck.leader ? deck.leader.name : "Sin líder"}
                    {" · "}
                    {deck.author}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((deck) => (
            <li key={deck.slug}>
              <Link
                href={detailHref(deck.slug, current)}
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
                    {deck.author}
                  </span>
                  <span className="mt-2 block text-xs text-stone-700">
                    {deck.missingCopies === 0
                      ? "Puedes jugarlo"
                      : `Te faltan ${formatCount(deck.missingCopies)} copias`}
                    {" · "}
                    Disponibles {deck.available}/{deck.listSize}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {filtered.length > PAGE_SIZE ? (
        <Pagination
          page={page}
          total={filtered.length}
          limit={PAGE_SIZE}
          onPage={(next) => publish({ ...query, page: next })}
          label="Paginación de recomendados"
        />
      ) : null}
    </section>
  );

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const falta = String(data.get("falta") ?? "");
    publish({
      q: String(data.get("q") ?? "").trim().slice(0, 80),
      falta: falta === "0" || falta === "10" || falta === "20" ? falta : "",
      colors: data.getAll("color").flatMap((value) => String(value).split(",")).slice(0, 8),
      leader: String(data.get("lider") ?? "").slice(0, 20),
      view: query.view,
      page: 1,
    });
  }

  function publish(next: SuggestionQuery) {
    setQuery(next);
    window.history.replaceState(null, "", suggestionHref(next));
  }
}

function matches(deck: SuggestedDeckMatch, query: SuggestionQuery) {
  if (query.falta) {
    const max = Number(query.falta);
    if (deck.missingCopies > max) return false;
  }
  if (query.leader && deck.leader?.code !== query.leader) return false;
  if (
    query.colors.length > 0 &&
    !query.colors.some((color) => leaderColorList(deck.leader?.color).includes(color))
  ) {
    return false;
  }
  if (!query.q) return true;
  const haystack = [deck.name, deck.author, deck.leader?.name, deck.leader?.code]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("es");
  return haystack.includes(query.q.toLocaleLowerCase("es"));
}

function suggestionHref(query: SuggestionQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.falta) params.set("falta", query.falta);
  if (query.leader) params.set("lider", query.leader);
  if (query.colors.length) params.set("color", query.colors.join(","));
  if (query.view === "list") params.set("vista", "lista");
  if (query.page > 1) params.set("pagina", String(query.page));
  const search = params.toString();
  return `/mazos${search ? `?${search}` : ""}#recomendados`;
}

function detailHref(slug: string, query: SuggestionQuery) {
  const params = new URLSearchParams();
  params.set("origen", suggestionHref(query));
  return `/mazos/sugeridos/${slug}?${params}`;
}

function leaderOptions(decks: SuggestedDeckMatch[]) {
  const leaders = new Map<string, string>();
  for (const deck of decks) {
    if (!deck.leader?.code || leaders.has(deck.leader.code)) continue;
    leaders.set(deck.leader.code, deck.leader.name);
  }
  return [...leaders]
    .map(([code, name]) => ({ code, name }))
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name, "es") || left.code.localeCompare(right.code, "es"),
    );
}

function leaderColors(decks: SuggestedDeckMatch[]) {
  const colors = new Set<string>();
  for (const deck of decks) {
    for (const color of leaderColorList(deck.leader?.color)) colors.add(color);
  }
  return [...colors].sort((left, right) => colorLabel(left).localeCompare(colorLabel(right), "es"));
}

function leaderColorList(color?: string | null) {
  if (!color) return [];
  return color
    .split(/[;/]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

