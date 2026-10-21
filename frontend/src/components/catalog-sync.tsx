"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { syncCatalog } from "@/lib/admin-actions";
import { formatCount } from "@/lib/format";
export function CatalogSync({
  games,
}: {
  games: {
    slug: string;
    name: string;
    cards: number;
    sets: number;
    status: "running" | "completed" | "failed" | null;
    detail: string;
    error?: string;
  }[];
}) {
  const router = useRouter();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const running = games.some((game) => game.status === "running");

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [running, router]);

  function update(slug: string) {
    setError(null);
    setPendingSlug(slug);
    startTransition(async () => {
      const result = await syncCatalog(slug);
      setPendingSlug(null);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <h2 className="text-base font-semibold text-stone-950">Catálogo</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
        Actualiza las cartas cuando salga una edición nueva. La descarga puede tardar unos minutos.
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {games.map((game) => {
          const busy = game.status === "running" || (isPending && pendingSlug === game.slug);
          return (
            <li
              key={game.slug}
              className="flex flex-col gap-3 rounded-xl bg-stone-50 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-950">{game.name}</p>
                <p className="mt-1 text-sm text-stone-600">
                  {formatCount(game.cards)} cartas · {formatCount(game.sets)} colecciones
                </p>
                <p className="mt-1 text-sm text-stone-500">{game.detail}</p>
                {game.status === "failed" && game.error ? (
                  <p className="mt-1 text-sm text-rose-700">{game.error}</p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => update(game.slug)}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white disabled:bg-stone-400"
              >
                {busy ? "Actualizando…" : "Actualizar"}
              </button>
            </li>
          );
        })}
      </ul>
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
