"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetShareLink, setShareEnabled } from "@/lib/library-actions";

export function SharePanel({
  enabled,
  slug,
}: {
  enabled: boolean;
  slug?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const path = slug ? `/u/${slug}` : "";

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

  async function copy() {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        Enlace público
      </p>
      {enabled && slug ? (
        <div className="mt-2 flex flex-col gap-2">
          <p className="truncate text-sm text-stone-800">{path}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex h-11 items-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white"
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setShareEnabled(false))}
              className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300 disabled:text-stone-300"
            >
              Ocultar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => resetShareLink())}
              className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300 disabled:text-stone-300"
            >
              Nuevo enlace
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setShareEnabled(true))}
          className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white disabled:bg-stone-400"
        >
          Compartir biblioteca y deseados
        </button>
      )}
    </div>
  );
}
