"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAlias } from "@/lib/profile-actions";

export function AliasForm({
  alias,
  id = "public-alias",
  showLabel = false,
}: {
  alias: string;
  id?: string;
  showLabel?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(alias);
  const [seen, setSeen] = useState(alias);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (alias !== seen) {
    setSeen(alias);
    setValue(alias);
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
