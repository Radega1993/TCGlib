"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCount } from "@/lib/format";
import { PublicPlayer } from "@/lib/players";

export function PlayerSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const listId = useId();
  const [text, setText] = useState(initial);
  const [seen, setSeen] = useState(initial);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [tracked, setTracked] = useState("");
  const [result, setResult] = useState<{ term: string; data: PublicPlayer[] }>({
    term: "",
    data: [],
  });

  if (initial !== seen) {
    setSeen(initial);
    setText(initial);
  }

  const term = text.trim();
  const matchesTerm = result.term === term;
  const suggestions = matchesTerm ? result.data : [];
  const waiting = term.length >= 2 && !matchesTerm;
  const resultKey = suggestions.map((player) => player.slug).join(",");
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
          `/api/players/suggest?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        const body = response.ok
          ? ((await response.json()) as { data: PublicPlayer[] })
          : { data: [] };
        setResult({ term, data: body.data.slice(0, 5) });
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

  function openPlayer(player: PublicPlayer) {
    setOpen(false);
    router.push(`/u/${player.slug}`);
  }

  return (
    <form
      className="relative"
      action="/jugadores"
      onSubmit={(event) => {
        event.preventDefault();
        setOpen(false);
        const next = term;
        router.push(next ? `/jugadores?q=${encodeURIComponent(next)}` : "/jugadores");
      }}
    >
      <label htmlFor={`${listId}-input`} className="sr-only">
        Nombre público
      </label>
      <div className="relative">
        <input
          id={`${listId}-input`}
          name="q"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            active >= 0 && suggestions[active]
              ? `${listId}-${suggestions[active].slug}`
              : undefined
          }
          value={text}
          maxLength={40}
          placeholder="Nombre público"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-12 w-full rounded-xl border border-stone-300 bg-white pr-24 pl-3 text-base text-stone-900 outline-none ring-rose-700 focus:ring-2"
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setText(event.target.value);
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
              openPlayer(suggestions[active]);
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
              {loading || waiting ? "Buscando…" : "Ningún perfil coincide."}
            </p>
          ) : (
            <ul id={listId} role="listbox" className="max-h-80 overflow-y-auto py-1">
              {suggestions.map((player, index) => (
                <li key={player.slug} role="presentation">
                  <a
                    id={`${listId}-${player.slug}`}
                    role="option"
                    aria-selected={index === active}
                    href={`/u/${player.slug}`}
                    className={`flex items-center gap-3 px-3 py-2 ${
                      index === active ? "bg-rose-50" : "hover:bg-stone-50"
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={(event) => {
                      event.preventDefault();
                      openPlayer(player);
                    }}
                  >
                    {player.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={player.picture}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="size-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-stone-200 text-sm font-medium text-stone-700">
                        {player.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-stone-950">
                        {player.name}
                      </span>
                      <span className="block truncate text-xs text-stone-500">
                        {formatCount(player.owned)} en biblioteca · {formatCount(player.trades)} intercambio · {formatCount(player.wanted)} deseados
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </form>
  );
}
