"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetShareLink } from "@/lib/library-actions";

export function SharePanel({ enabled, slug }: { enabled: boolean; slug?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

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
    if (!slug) return;
    await navigator.clipboard.writeText(`${window.location.origin}/u/${slug}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        Perfil público
      </p>
      {enabled && slug ? (
        <div className="mt-2 flex flex-col gap-3">
          <p className="text-xs leading-5 text-stone-500">
            Apareces en Jugadores. Quien entre ve la biblioteca, el intercambio y los deseados. El email no se muestra.
          </p>
          <p className="truncate text-xs text-stone-500">/u/{slug}</p>
          <div className="flex gap-2">
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
              onClick={() => run(() => resetShareLink())}
              className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300 disabled:text-stone-300"
            >
              Nuevo
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-stone-500">
          En privado no apareces en Jugadores y el enlace deja de funcionar. Cámbialo en el interruptor que hay junto al nombre público.
        </p>
      )}
    </div>
  );
}
