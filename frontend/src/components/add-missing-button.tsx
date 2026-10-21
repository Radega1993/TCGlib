"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMissingToWishlist } from "@/lib/collection-actions";
import { formatCount } from "@/lib/format";

export function AddMissingButton({
  setId,
  missing,
  tcg = "one-piece",
}: {
  setId: string;
  missing: number;
  tcg?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  if (missing <= 0) {
    return (
      <p className="rounded-2xl bg-white px-4 py-3 text-sm text-stone-700 ring-1 ring-stone-200">
        Este set está completo para el objetivo actual.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          setFailed(false);
          startTransition(async () => {
            const result = await addMissingToWishlist(setId, tcg);
            if (!result.ok) {
              setFailed(true);
              setMessage("No se pudieron añadir. Inténtalo de nuevo.");
              return;
            }
            const added = result.added ?? 0;
            setMessage(
              added === 0
                ? "Esas cartas ya estaban en deseados."
                : added === 1
                  ? "Añadida 1 carta a deseados."
                  : `Añadidas ${formatCount(added)} cartas a deseados.`,
            );
            router.refresh();
          });
        }}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Añadiendo…" : "Añadir cartas faltantes a deseados"}
      </button>
      {message ? (
        <p className={`text-sm ${failed ? "text-rose-700" : "text-stone-600"}`}>{message}</p>
      ) : null}
    </div>
  );
}
