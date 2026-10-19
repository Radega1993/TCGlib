"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { catalogHref, productHref } from "@/lib/catalog-query";
import { CardSuggestion, CatalogQuery } from "@/lib/types";

export function CardSearch({
  query,
  text,
  onTextChange,
  onSearch,
}: {
  query: CatalogQuery;
  text: string;
  onTextChange: (value: string) => void;
  onSearch: () => void;
}) {
  const router = useRouter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [tracked, setTracked] = useState("");
  const [result, setResult] = useState<{ term: string; data: CardSuggestion[] }>({
    term: "",
    data: [],
  });

  const term = text.trim();
  const matchesTerm = result.term === term;
  const suggestions = matchesTerm ? result.data : [];
  const waiting = term.length >= 2 && !matchesTerm;
  const resultKey = suggestions.map((item) => item.externalId).join(",");
  if (tracked !== resultKey) {
    setTracked(resultKey);
    setActive(-1);
  }

  useEffect(() => {
    if (!open || term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/suggest?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        const body = response.ok
          ? ((await response.json()) as { data: CardSuggestion[] })
          : { data: [] };
        setResult({ term, data: body.data });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResult({ term, data: [] });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, term]);

  useEffect(() => {
    if (active < 0) return;
    document
      .getElementById(listId)
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, listId, resultKey]);

  const showList = open && term.length >= 2;
  const returnTo = catalogHref(query);

  function openCard(suggestion: CardSuggestion) {
    router.push(productHref(suggestion.externalId, returnTo));
  }

  return (
    <form
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        setOpen(false);
        onSearch();
      }}
    >
      <label
        htmlFor={`${listId}-input`}
        className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500"
      >
        Nombre o código
      </label>
      <div className="relative">
        <input
          id={`${listId}-input`}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            active >= 0 && suggestions[active]
              ? `${listId}-${suggestions[active].externalId}`
              : undefined
          }
          value={text}
          placeholder="Luffy, OP03-070…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-12 w-full rounded-xl border border-stone-300 bg-white pr-24 pl-3 text-base text-stone-900 outline-none ring-rose-700 focus:ring-2"
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            onTextChange(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((index) =>
                Math.min(index + 1, Math.max(suggestions.length - 1, -1)),
              );
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, -1));
            } else if (event.key === "Escape") {
              setOpen(false);
            } else if (
              event.key === "Enter" &&
              showList &&
              active >= 0 &&
              suggestions[active]
            ) {
              event.preventDefault();
              openCard(suggestions[active]);
            }
          }}
        />
        <button
          type="submit"
          className="absolute top-1.5 right-1.5 h-9 rounded-lg bg-stone-900 px-3 text-sm font-medium text-white"
        >
          Buscar
        </button>
      </div>
      {showList ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-stone-200">
          {suggestions.length === 0 ? (
            <p className="px-3 py-3 text-sm text-stone-500">
              {loading || waiting ? "Buscando…" : "Ninguna carta coincide."}
            </p>
          ) : (
            <ul
              id={listId}
              role="listbox"
              className="max-h-80 overflow-y-auto py-1"
            >
              {suggestions.map((suggestion, index) => {
                const meta = [suggestion.code, suggestion.set.code]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={suggestion.externalId} role="presentation">
                    <a
                      id={`${listId}-${suggestion.externalId}`}
                      role="option"
                      aria-selected={index === active}
                      href={productHref(suggestion.externalId, returnTo)}
                      className={`grid grid-cols-[2.5rem_minmax(0,0.8fr)_minmax(0,1.2fr)] items-center gap-3 px-3 py-2 ${
                        index === active ? "bg-rose-50" : "hover:bg-stone-50"
                      }`}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActive(index)}
                      onClick={(event) => {
                        event.preventDefault();
                        openCard(suggestion);
                      }}
                    >
                      <span className="relative block h-14 w-10 overflow-hidden rounded-md bg-stone-100">
                        {suggestion.image ? (
                          <Image
                            src={suggestion.image}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-contain"
                          />
                        ) : null}
                      </span>
                      <span className="truncate text-xs text-stone-500">
                        {meta || suggestion.set.name}
                      </span>
                      <span className="text-right text-sm leading-5 font-medium text-stone-900">
                        {suggestion.name}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </form>
  );
}
