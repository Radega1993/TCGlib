"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { wishSuggestedDeck } from "@/lib/deck-actions";
import { formatCount } from "@/lib/format";

export function SuggestedWishlist({ slug, missing }: { slug: string; missing: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await wishSuggestedDeck(slug);
      if (!result.ok) {
        if ("error" in result && result.error === "auth") {
          router.push(`/entrar?return=${encodeURIComponent(`/mazos/sugeridos/${slug}`)}`);
          return;
        }
        setError("No se pudo añadir a deseados.");
        return;
      }
      setMessage(
        result.data.copies > 0
          ? `Añadidas ${formatCount(result.data.copies)} copias a deseados.`
          : "Deseados ya cubría las que faltan.",
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={add}
        disabled={pending || missing === 0}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white disabled:bg-stone-200 disabled:text-stone-500"
      >
        {pending ? "Añadiendo…" : "Añadir faltantes a deseados"}
      </button>
      {message ? <p className="text-sm text-stone-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-800">{error}</p> : null}
    </div>
  );
}
