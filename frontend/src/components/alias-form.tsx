"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAlias } from "@/lib/profile-actions";

export function AliasForm({ alias }: { alias: string }) {
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
    <form
      className="rounded-xl bg-white p-3 ring-1 ring-stone-200"
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
      <label className="block text-xs font-medium text-stone-500" htmlFor="public-alias">
        Nombre público
      </label>
      <p className="mt-1 text-xs leading-5 text-stone-500">
        Si lo dejas vacío, en el enlace público se ve tu nombre de Google.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          id="public-alias"
          value={value}
          maxLength={24}
          placeholder="Tu alias"
          onChange={(event) => setValue(event.target.value)}
          className="h-11 min-w-0 flex-1 rounded-xl bg-stone-50 px-3 text-sm text-stone-950 ring-1 ring-stone-300 outline-none"
        />
        <button
          type="submit"
          disabled={pending || value.trim() === alias}
          className="inline-flex h-11 items-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white disabled:bg-stone-300"
        >
          Guardar
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-800">{error}</p> : null}
    </form>
  );
}
