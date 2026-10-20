"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshSuggestedDecks } from "@/lib/admin-actions";
import { formatCount } from "@/lib/format";

export function SuggestedDecks({ total }: { total: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await refreshSuggestedDecks();
      if (!result.ok || !result.data) {
        setError(result.ok ? "No se pudo leer la lista pública de mazos." : result.error);
        return;
      }
      setMessage(
        result.data.added
          ? `Añadidos ${formatCount(result.data.added)}. Los ${formatCount(result.data.kept)} que ya estaban no se han tocado.`
          : "No hay mazos nuevos. Los que ya estaban siguen igual.",
      );
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Mazos de la comunidad</h2>
          <p className="mt-1 text-sm text-stone-500">
            {formatCount(total)} guardados. Añade hasta 3 listas de cada líder y no cambia las que ya estaban.
          </p>
        </div>
        <button
          type="button"
          onClick={update}
          disabled={pending}
          className="inline-flex h-10 items-center rounded-full bg-stone-900 px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Actualizando…" : "Actualizar mazos"}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-stone-600">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
