"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setShareEnabled } from "@/lib/library-actions";
import { setAlias } from "@/lib/profile-actions";

export function AliasForm({
  alias,
  shareEnabled,
  id = "public-alias",
  showLabel = false,
}: {
  alias: string;
  shareEnabled: boolean;
  id?: string;
  showLabel?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(alias);
  const [seen, setSeen] = useState(alias);
  const [enabled, setEnabled] = useState(shareEnabled);
  const [seenShare, setSeenShare] = useState(shareEnabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (alias !== seen) {
    setSeen(alias);
    setValue(alias);
  }
  if (shareEnabled !== seenShare) {
    setSeenShare(shareEnabled);
    setEnabled(shareEnabled);
  }

  return (
    <div className="min-w-0 flex-1 md:flex-none">
      <form
        className="flex min-w-0 items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          const next = value.trim();
          startTransition(async () => {
            const result = await setAlias(next);
            if (!result.ok) {
              setError(result.error ?? "No se pudo guardar el alias");
              return;
            }
            router.refresh();
          });
        }}
      >
        <label
          className={showLabel ? "shrink-0 text-xs font-medium text-stone-500" : "sr-only"}
          htmlFor={id}
        >
          Nombre público
        </label>
        <input
          id={id}
          value={value}
          maxLength={24}
          placeholder="Nombre público"
          title="Si lo dejas vacío, en el enlace público se ve tu nombre de Google."
          onChange={(event) => setValue(event.target.value)}
          className="h-11 min-w-0 flex-1 rounded-xl bg-white px-3 text-sm text-stone-950 ring-1 ring-stone-300 outline-none md:w-44 md:flex-none lg:w-52"
        />
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={pending}
          onClick={() => {
            const next = !enabled;
            setError(null);
            setEnabled(next);
            startTransition(async () => {
              const result = await setShareEnabled(next);
              if (!result.ok) {
                setEnabled(!next);
                setError("No se pudo cambiar la visibilidad");
                return;
              }
              router.refresh();
            });
          }}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-2.5 text-sm font-medium text-stone-900 ring-1 ring-stone-300 disabled:text-stone-400"
        >
          {enabled ? "Público" : "Privado"}
          <span
            className={`relative h-5 w-9 rounded-full ${enabled ? "bg-stone-900" : "bg-stone-300"}`}
          >
            <span
              className={`absolute top-0.5 size-4 rounded-full bg-white ${enabled ? "left-4" : "left-0.5"}`}
            />
          </span>
        </button>
        <button
          type="submit"
          disabled={pending || value.trim() === alias}
          className="inline-flex h-11 shrink-0 items-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white disabled:bg-stone-300"
        >
          Guardar
        </button>
      </form>
      {error ? <p className="mt-1 text-xs text-rose-800">{error}</p> : null}
    </div>
  );
}
