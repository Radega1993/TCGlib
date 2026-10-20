"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { importDeckInto, importNewDeck } from "@/lib/deck-actions";
import { DeckDetail } from "@/lib/types";

export function DeckImport({
  deckId,
  onImported,
}: {
  deckId?: string;
  onImported?: (deck: DeckDetail, notes: string[]) => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const text = source.trim();
    if (!text) {
      setError("Pega un mazo en texto o JSON.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = deckId ? await importDeckInto(deckId, text) : await importNewDeck(text);
      if (!result.ok) {
        if (result.error === "auth") {
          router.push("/entrar?return=/mazos");
          return;
        }
        setError(result.message ?? "No se pudo importar el mazo.");
        return;
      }
      if (deckId && onImported) {
        onImported(result.data.deck, result.data.notes);
        setSource("");
        setOpen(false);
        return;
      }
      sessionStorage.setItem("tcglib-deck-notes", JSON.stringify(result.data.notes));
      router.push(`/mazos/${result.data.deck.id}`);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 shrink-0 items-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300"
      >
        Importar
      </button>
    );
  }

  return (
    <div className="order-last basis-full rounded-2xl bg-white p-3 ring-1 ring-stone-200">
      <p className="text-sm font-medium text-stone-950">Importar de OP Sim</p>
      <p className="mt-1 text-sm text-stone-600">
        Pega el texto (1xOP01-001) o el JSON. Las variantes _p1 y _r1 cuentan como la misma carta.
      </p>
      <label className="sr-only" htmlFor={deckId ? `opsim-${deckId}` : "opsim-new"}>
        Mazo de OP Sim
      </label>
      <textarea
        id={deckId ? `opsim-${deckId}` : "opsim-new"}
        value={source}
        onChange={(event) => setSource(event.target.value)}
        rows={8}
        placeholder={"1xOP16-022\n4xOP16-045"}
        className="mt-3 w-full rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-950 ring-1 ring-stone-300 outline-none"
      />
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.json,text/plain,application/json"
        className="mt-2 block w-full text-sm text-stone-600 file:mr-3 file:h-11 file:rounded-xl file:border-0 file:bg-stone-100 file:px-3 file:text-sm file:font-medium file:text-stone-900"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void file.text().then((text) => {
            setSource(text);
            setError(null);
          });
        }}
      />
      {error ? <p className="mt-2 text-sm text-rose-800">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="inline-flex h-11 items-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white disabled:bg-stone-300"
        >
          {pending ? "Importando…" : "Importar mazo"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setError(null);
            if (fileRef.current) fileRef.current.value = "";
          }}
          className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
