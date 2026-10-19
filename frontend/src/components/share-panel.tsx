"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetShareLink, setShareEnabled } from "@/lib/library-actions";
import { ShareView } from "@/lib/types";

const LINKS: { id: ShareView; label: string }[] = [
  { id: "library", label: "Biblioteca" },
  { id: "wanted", label: "Deseados" },
  { id: "trades", label: "Intercambio" },
];

export function SharePanel({
  enabled,
  librarySlug,
  wantedSlug,
  tradeSlug,
}: {
  enabled: boolean;
  librarySlug?: string;
  wantedSlug?: string;
  tradeSlug?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState<ShareView | null>(null);
  const slugs: Record<ShareView, string | undefined> = {
    library: librarySlug,
    wanted: wantedSlug,
    trades: tradeSlug,
  };

  function run(action: () => Promise<{ ok: boolean; error?: "auth" }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok && result.error === "auth") {
        router.push("/entrar?return=/biblioteca");
        return;
      }
      router.refresh();
    });
  }

  async function copy(list: ShareView) {
    const slug = slugs[list];
    if (!slug) return;
    await navigator.clipboard.writeText(`${window.location.origin}/u/${slug}`);
    setCopied(list);
    window.setTimeout(() => setCopied((current) => (current === list ? null : current)), 2000);
  }

  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        Enlaces públicos
      </p>
      {enabled ? (
        <div className="mt-2 flex flex-col gap-3">
          <p className="text-xs leading-5 text-stone-500">
            Cada enlace muestra solo esa lista.
          </p>
          {LINKS.map((link) => (
            <div key={link.id}>
              <p className="text-sm font-medium text-stone-900">{link.label}</p>
              <p className="truncate text-xs text-stone-500">
                {slugs[link.id] ? `/u/${slugs[link.id]}` : "Sin enlace"}
              </p>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  disabled={!slugs[link.id]}
                  onClick={() => void copy(link.id)}
                  className="inline-flex h-11 items-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white disabled:bg-stone-300"
                >
                  {copied === link.id ? "Copiado" : "Copiar"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => resetShareLink(link.id))}
                  className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300 disabled:text-stone-300"
                >
                  Nuevo
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setShareEnabled(false))}
            className="inline-flex h-11 items-center justify-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300 disabled:text-stone-300"
          >
            Ocultar
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setShareEnabled(true))}
          className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white disabled:bg-stone-400"
        >
          Crear enlaces
        </button>
      )}
    </div>
  );
}
