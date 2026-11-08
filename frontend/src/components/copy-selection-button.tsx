"use client";

import { useState } from "react";
import { copyLibrarySelection } from "@/lib/library-actions";
import { CatalogQuery } from "@/lib/types";

export function CopySelectionButton({
  list,
  tcg,
  query,
}: {
  list: "owned" | "wanted" | "trade";
  tcg: string;
  query?: CatalogQuery;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        title="Copia la cantidad y el código de las cartas de este filtro, en todas las páginas."
        onClick={() => {
          setNote(null);
          setPending(true);
          const pendingText = copyLibrarySelection(list, tcg, query);
          void writeSelection(pendingText)
            .then((copied) => setNote(copied))
            .finally(() => setPending(false));
        }}
        className="inline-flex h-11 items-center rounded-xl bg-white px-3 text-sm font-medium text-stone-900 ring-1 ring-stone-300 disabled:text-stone-400"
      >
        Copiar selección
      </button>
      {note ? <span className="text-sm text-stone-600">{note}</span> : null}
    </div>
  );
}

async function writeSelection(
  pendingText: ReturnType<typeof copyLibrarySelection>,
) {
  try {
    const text = clipboardPromise(pendingText);
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": text.then((value) => new Blob([value], { type: "text/plain" })),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(await text);
    }
    return "Copiado";
  } catch (error) {
    if (error instanceof Error && error.message === "empty") {
      return "No hay códigos para copiar.";
    }
    return "No se pudo copiar.";
  }
}

function clipboardPromise(pendingText: ReturnType<typeof copyLibrarySelection>) {
  return pendingText.then((result) => {
    if (!result.ok || !result.text) {
      throw new Error(result.ok ? "empty" : result.error === "empty" ? "empty" : "fail");
    }
    return result.text;
  });
}
