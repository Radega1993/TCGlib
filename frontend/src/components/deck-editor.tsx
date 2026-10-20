"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { DeckImport } from "@/components/deck-import";
import { QuantityStepper } from "@/components/quantity-stepper";
import { DeckBreakdown, StatusCopy } from "@/components/public-deck";
import { productHref } from "@/lib/catalog-query";
import {
  addDeckMissing,
  DeckDraft,
  deleteDeck,
  duplicateDeck,
  previewDeck,
  resetDeckShare,
  saveDeck,
  searchDeckCards,
  setDeckShare,
} from "@/lib/deck-actions";
import { formatName } from "@/lib/deck-copy";
import { opsimFileName, opsimJson, opsimText } from "@/lib/opsim";
import { cardTypeLabel, colorClass, colorLabel, splitColors } from "@/lib/format";
import { DeckCard, DeckDetail, DeckFormat, DeckSearchCard } from "@/lib/types";

type Draft = {
  name: string;
  format: DeckFormat;
  leaderCode: string | null;
  lines: { code: string; quantity: number }[];
};

export function DeckEditor({ deck, author }: { deck: DeckDetail; author: string }) {
  const router = useRouter();
  const [seenId, setSeenId] = useState(deck.id);
  const [draft, setDraft] = useState<Draft>(() => draftOf(deck));
  const [saved, setSaved] = useState<Draft>(() => draftOf(deck));
  const [view, setView] = useState(deck);
  const [leaderCard, setLeaderCard] = useState<DeckCard | null>(deck.leader);
  const [owned, setOwned] = useState<Record<string, number>>(() => ownedFrom(deck));
  const [share, setShare] = useState({ enabled: deck.shareEnabled, slug: deck.publicSlug });
  const [message, setMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (deck.id !== seenId) {
    setSeenId(deck.id);
    setDraft(draftOf(deck));
    setSaved(draftOf(deck));
    setView(deck);
    setLeaderCard(deck.leader);
    setOwned(ownedFrom(deck));
    setShare({ enabled: deck.shareEnabled, slug: deck.publicSlug });
    setNotes([]);
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => {
    const raw = sessionStorage.getItem("tcglib-deck-notes");
    if (!raw) return;
    sessionStorage.removeItem("tcglib-deck-notes");
    let items: string[] = [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      items = parsed.filter((item): item is string => typeof item === "string");
    } catch {
      return;
    }
    if (items.length === 0) return;
    queueMicrotask(() => {
      setNotes(items);
      setMessage("Mazo importado.");
    });
  }, []);

  useEffect(() => {
    if (!draft.name.trim()) return;
    let current = true;
    const timer = window.setTimeout(() => {
      void previewDeck(deck.id, toPayload(draft)).then((result) => {
        if (!current || !result.ok) return;
        setView(result.data);
        setOwned((ownedNow) => ({ ...ownedNow, ...ownedFrom(result.data) }));
        if (result.data.leader?.code === draft.leaderCode) setLeaderCard(result.data.leader);
      });
    }, 300);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [deck.id, draft]);

  function run(action: () => Promise<{ ok: boolean; error?: "auth" }>, done?: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        if (result.error === "auth") {
          router.push(`/entrar?return=${encodeURIComponent(`/mazos/${deck.id}`)}`);
          return;
        }
        setError("No se pudo completar la acción.");
        return;
      }
      if (done) setMessage(done);
      router.refresh();
    });
  }

  function remember(card: DeckSearchCard) {
    setOwned((current) => ({ ...current, [card.code]: card.owned }));
  }

  function addCard(card: DeckSearchCard) {
    remember(card);
    setDraft((current) => {
      const existing = current.lines.find((line) => line.code === card.code);
      const lines = existing
        ? current.lines.map((line) =>
            line.code === card.code ? { ...line, quantity: Math.min(4, line.quantity + 1) } : line,
          )
        : [...current.lines, { code: card.code, quantity: 1 }];
      return { ...current, lines };
    });
  }

  const shownLeader =
    draft.leaderCode && leaderCard?.code === draft.leaderCode ? leaderCard : null;
  const returnTo = `/mazos/${deck.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/mazos" className="text-sm font-medium text-stone-600">
          Mazos
        </Link>
        <input
          value={draft.name}
          maxLength={60}
          aria-label="Nombre del mazo"
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          className="mt-2 h-11 w-full rounded-xl bg-white px-3 text-lg font-semibold text-stone-950 ring-1 ring-stone-300 outline-none"
        />
        <div className="mt-3 flex gap-2">
          {(["extra", "standard"] as const).map((format) => (
            <button
              key={format}
              type="button"
              aria-pressed={draft.format === format}
              onClick={() => setDraft((current) => ({ ...current, format }))}
              className={`inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium ${
                draft.format === format
                  ? "bg-stone-900 text-white"
                  : "bg-white text-stone-700 ring-1 ring-stone-300"
              }`}
            >
              {formatName(format)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-stone-600">Los 10 DON!! van aparte y no cuentan entre las 50.</p>

      <StatusCopy
        ok={view.construction.ok}
        size={view.construction.size}
        target={view.construction.target}
        issues={view.construction.issues}
        format={view.format}
        legality={view.legality}
        rulesLabel={view.rulesLabel}
      />
      <article className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Disponibilidad</p>
        <p className="mt-1 text-sm font-medium text-stone-950">
          {view.availability.available}/{view.availability.listSize} copias que ya tienes
        </p>
        <p className="mt-1 text-sm text-stone-600">
          Faltan {view.availability.missingCopies}{" "}
          {view.availability.missingCopies === 1 ? "copia" : "copias"}. La lista mide{" "}
          {view.construction.size}/{view.construction.target}. Marcar cartas para intercambio no las resta.
        </p>
      </article>

      <section className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">
        <h2 className="text-sm font-medium text-stone-950">Líder</h2>
        {shownLeader ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <Face card={shownLeader} href={shownLeader.externalId ? productHref(shownLeader.externalId, returnTo) : undefined} />
            <button
              type="button"
              onClick={() => setDraft((current) => ({ ...current, leaderCode: null }))}
              className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300"
            >
              Quitar
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-stone-500">Todavía no has elegido líder.</p>
        )}
        <CardSearch
          label="Buscar líder"
          role="leader"
          onPick={(card) => {
            remember(card);
            setLeaderCard(card);
            setDraft((current) => ({
              ...current,
              leaderCode: card.code,
              lines: current.lines.filter((line) => line.code !== card.code),
            }));
          }}
        />
      </section>

      <section className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">
        <h2 className="text-sm font-medium text-stone-950">Añadir cartas</h2>
        <CardSearch label="Buscar carta" role="card" onPick={addCard} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-stone-950">
          Lista {draft.lines.reduce((sum, line) => sum + line.quantity, 0)}/50
        </h2>
        {draft.lines.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-600 ring-1 ring-stone-200">
            Busca por nombre o por código para añadir cartas.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {draft.lines.map((line) => {
              const card = view.lines.find((item) => item.code === line.code);
              const have = owned[line.code] ?? card?.owned ?? 0;
              const missing = Math.max(0, line.quantity - have);
              const face = card ?? {
                externalId: null,
                code: line.code,
                name: line.code,
                cardType: null,
                color: null,
                cost: null,
                image: null,
              };
              return (
                <li key={line.code} className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">
                  <Face
                    card={face}
                    href={face.externalId ? productHref(face.externalId, returnTo) : undefined}
                  />
                  <div className="mt-3">
                    <QuantityStepper
                      label="En el mazo"
                      value={line.quantity}
                      max={4}
                      pending={false}
                      onChange={(quantity) =>
                        setDraft((current) => ({
                          ...current,
                          lines:
                            quantity <= 0
                              ? current.lines.filter((item) => item.code !== line.code)
                              : current.lines.map((item) =>
                                  item.code === line.code ? { ...item, quantity } : item,
                                ),
                        }))
                      }
                    />
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    Necesarias {line.quantity} · Tengo {have} · Faltan {missing}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-sm font-medium text-stone-800">
          Faltan {view.availability.missingCopies}{" "}
          {view.availability.missingCopies === 1 ? "copia" : "copias"}
        </p>
        {dirty ? (
          <p className="text-sm text-stone-500">Guarda el mazo para añadir las que faltan.</p>
        ) : null}
        <button
          type="button"
          disabled={pending || dirty || view.availability.missingCopies === 0}
          onClick={() =>
            run(async () => {
              const result = await addDeckMissing(deck.id);
              if (result.ok) setMessage(
                result.data.copies > 0
                  ? `Añadidas ${result.data.copies} copias a deseados.`
                  : "Deseados ya cubría las que faltan.",
              );
              return result;
            })
          }
          className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-3 text-sm font-medium text-stone-900 ring-1 ring-stone-300 disabled:text-stone-400"
        >
          Añadir faltantes a deseados
        </button>
      </section>

      <DeckBreakdown summary={view.summary} />

      {error ? <p className="text-sm text-rose-800">{error}</p> : null}
      {message ? <p className="text-sm text-stone-700">{message}</p> : null}
      {notes.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm text-stone-600">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <div className="sticky bottom-3 z-10 flex flex-col gap-2">
        <button
          type="button"
          disabled={!dirty || pending || !draft.name.trim()}
          onClick={() =>
            run(async () => {
              const result = await saveDeck(deck.id, toPayload(draft));
              if (result.ok) {
                setSaved(draft);
                setView(result.data);
                setOwned(ownedFrom(result.data));
                setShare({
                  enabled: result.data.shareEnabled,
                  slug: result.data.publicSlug,
                });
                setMessage("Mazo guardado.");
              }
              return result;
            })
          }
          className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white disabled:bg-stone-300"
        >
          {dirty ? "Guardar mazo" : "Guardado"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => duplicateDeck(deck.id))}
          className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300"
        >
          Duplicar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm("¿Eliminar este mazo?")) run(() => deleteDeck(deck.id));
          }}
          className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-rose-800 ring-1 ring-rose-200"
        >
          Eliminar
        </button>
      </div>

      <section className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">
        <h2 className="text-sm font-medium text-stone-950">OP Sim</h2>
        <p className="mt-1 text-sm text-stone-600">
          Texto o JSON. El líder sale como 1xCODE. Al importar, _p1 y _r1 son la misma carta.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(opsimText(draft));
              setMessage("Texto de OP Sim copiado.");
              setNotes([]);
              setError(null);
            }}
            className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300"
          >
            Copiar texto
          </button>
          <button
            type="button"
            onClick={() => download(opsimFileName(draft.name, "txt"), opsimText(draft), "text/plain")}
            className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300"
          >
            Descargar texto
          </button>
          <button
            type="button"
            onClick={() =>
              download(
                opsimFileName(draft.name, "json"),
                opsimJson({ ...draft, author }),
                "application/json",
              )
            }
            className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300"
          >
            Descargar JSON
          </button>
        </div>
        <div className="mt-3">
          <DeckImport
            deckId={deck.id}
            onImported={(next, importedNotes) => {
              const nextDraft = draftOf(next);
              setDraft(nextDraft);
              setSaved(nextDraft);
              setView(next);
              setLeaderCard(next.leader);
              setOwned(ownedFrom(next));
              setShare({ enabled: next.shareEnabled, slug: next.publicSlug });
              setNotes(importedNotes);
              setMessage("Mazo importado.");
              setError(null);
              router.refresh();
            }}
          />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">
        <h2 className="text-sm font-medium text-stone-950">Enlace público</h2>
        <p className="mt-1 text-sm text-stone-600">
          Muestra el líder y la lista. No muestra cuántas copias tienes.
        </p>
        {share.enabled && share.slug ? (
          <div className="mt-3 flex flex-col gap-2">
            <p className="truncate text-xs text-stone-500">/mazo/{share.slug}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(`${window.location.origin}/mazo/${share.slug}`);
                  setMessage("Enlace copiado.");
                }}
                className="inline-flex h-11 items-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white"
              >
                Copiar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const result = await resetDeckShare(deck.id);
                    if (result.ok) setShare({ enabled: true, slug: result.data.publicSlug });
                    return result;
                  }, "Enlace nuevo.")
                }
                className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300"
              >
                Nuevo
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const result = await setDeckShare(deck.id, false);
                    if (result.ok) setShare({ enabled: false, slug: null });
                    return result;
                  }, "Enlace oculto.")
                }
                className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300"
              >
                Ocultar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const result = await setDeckShare(deck.id, true);
                if (result.ok) {
                  setShare({ enabled: result.data.shareEnabled, slug: result.data.publicSlug });
                }
                return result;
              }, "Enlace creado.")
            }
            className="mt-3 inline-flex h-11 items-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white disabled:bg-stone-300"
          >
            Crear enlace
          </button>
        )}
      </section>
    </div>
  );
}

function CardSearch({
  label,
  role,
  onPick,
}: {
  label: string;
  role: "leader" | "card";
  onPick: (card: DeckSearchCard) => void;
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<DeckSearchCard[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) return;
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const result = await searchDeckCards(query, role);
        if (result.ok) setResults(result.data);
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [role, term]);

  return (
    <div className="mt-3">
      <label className="sr-only" htmlFor={`deck-search-${role}`}>
        {label}
      </label>
      <input
        id={`deck-search-${role}`}
        value={term}
        placeholder={label}
        onChange={(event) => {
          setTerm(event.target.value);
          if (event.target.value.trim().length < 2) setResults([]);
        }}
        className="h-11 w-full rounded-xl bg-stone-50 px-3 text-sm text-stone-950 ring-1 ring-stone-300 outline-none"
      />
      {pending ? <p className="mt-2 text-xs text-stone-500">Buscando…</p> : null}
      {results.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {results.map((card) => (
            <li key={card.code}>
              <button
                type="button"
                onClick={() => {
                  onPick(card);
                  setTerm("");
                  setResults([]);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-stone-50"
              >
                <Face card={card} />
                <span className="ml-auto shrink-0 text-xs text-stone-500">Tengo {card.owned}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Face({ card, href }: { card: DeckCard; href?: string }) {
  const body = (
    <span className="flex min-w-0 items-center gap-3">
      <span className="relative block h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-stone-100">
        {card.image ? <Image src={card.image} alt="" fill sizes="44px" className="object-contain" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-stone-950">{card.name}</span>
        <span className="mt-1 flex items-center gap-2 text-xs text-stone-500">
          <ColorDots color={card.color} />
          {card.code}
          {card.cardType ? ` · ${cardTypeLabel(card.cardType)}` : ""}
        </span>
      </span>
    </span>
  );
  if (!href) return body;
  return (
    <Link href={href} className="block min-w-0">
      {body}
    </Link>
  );
}

function ColorDots({ color }: { color: string | null }) {
  const colors = splitColors(color ?? undefined);
  if (colors.length === 0) return null;
  return (
    <span className="inline-flex gap-1">
      {colors.map((item) => (
        <span key={item} className={`size-2.5 rounded-full ${colorClass(item)}`} title={colorLabel(item)} />
      ))}
    </span>
  );
}

function draftOf(deck: DeckDetail): Draft {
  return {
    name: deck.name,
    format: deck.format,
    leaderCode: deck.leader?.code ?? null,
    lines: deck.lines.map((line) => ({ code: line.code, quantity: line.needed })),
  };
}

function ownedFrom(deck: DeckDetail) {
  return Object.fromEntries(deck.lines.map((line) => [line.code, line.owned]));
}

function toPayload(draft: Draft): DeckDraft {
  return {
    name: draft.name.trim(),
    format: draft.format,
    ...(draft.leaderCode ? { leaderCode: draft.leaderCode } : {}),
    lines: draft.lines,
  };
}

function download(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
