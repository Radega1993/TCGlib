"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCollectionGoal } from "@/lib/collection-actions";
import { formatCount } from "@/lib/format";
import { CollectionGoal, CollectionMode, CollectionVariant } from "@/lib/types";

const MODES: { id: CollectionMode; label: string; text: string }[] = [
  { id: "base", label: "Base", text: "Una copia de cada carta base." },
  { id: "master", label: "Master set", text: "Una copia de cada variante que dejes marcada." },
  { id: "playset", label: "Playset", text: "Cuatro copias jugables. Los líderes piden una y DON!! no cuenta." },
  { id: "custom", label: "Personalizado", text: "Las copias que elijas de cada carta base." },
];

export function GoalPicker({
  goal,
  variants,
}: {
  goal: CollectionGoal;
  variants: CollectionVariant[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const signature = `${goal.mode}|${goal.customCopies}|${goal.excludedVariants.join("\n")}`;
  const [seen, setSeen] = useState(signature);
  const [mode, setMode] = useState(goal.mode);
  const [copies, setCopies] = useState(String(goal.customCopies));
  const [excluded, setExcluded] = useState(goal.excludedVariants);

  if (signature !== seen) {
    setSeen(signature);
    setMode(goal.mode);
    setCopies(String(goal.customCopies));
    setExcluded(goal.excludedVariants);
  }

  const description = MODES.find((item) => item.id === mode)?.text;
  const included = variants.filter((variant) => !excluded.includes(variant.label)).length;

  function persist(next: { mode: CollectionMode; copies: string; excluded: string[] }) {
    const customCopies = clampCopies(next.copies);
    setError(null);
    startTransition(async () => {
      const result = await saveCollectionGoal({
        mode: next.mode,
        customCopies,
        excludedVariants: next.excluded,
      });
      if (!result.ok) {
        setError("No se pudo guardar el objetivo.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <h2 className="text-sm font-medium text-stone-950">Objetivo</h2>
      <p className="mt-1 text-sm text-stone-500">
        Una carta cuenta cuando llegas a las copias de ese objetivo.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={mode === item.id}
            disabled={pending}
            onClick={() => {
              setMode(item.id);
              persist({ mode: item.id, copies, excluded });
            }}
            className={`h-11 rounded-xl px-3 text-sm font-medium ${
              mode === item.id
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {description ? <p className="mt-3 text-sm text-stone-600">{description}</p> : null}
      {mode === "custom" ? (
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setCopies(String(clampCopies(copies)));
            persist({ mode, copies, excluded });
          }}
        >
          <label className="block text-xs font-medium text-stone-500" htmlFor="custom-copies">
            Copias de cada carta base
            <input
              id="custom-copies"
              inputMode="numeric"
              min={1}
              max={99}
              value={copies}
              onChange={(event) => setCopies(event.target.value)}
              className="mt-1 h-11 w-24 rounded-xl bg-stone-50 px-3 text-sm text-stone-950 ring-1 ring-stone-200"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white"
          >
            Guardar
          </button>
        </form>
      ) : null}
      {mode === "master" ? (
        <details className="mt-3 rounded-xl bg-stone-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-stone-800">
            Variantes del master set · {formatCount(included)} de {formatCount(variants.length)}
          </summary>
          <p className="mt-2 text-sm text-stone-500">
            Cada set del catálogo va aparte. Las cartas base siempre cuentan. Desmarca las variantes que no quieras incluir.
          </p>
          {variants.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">Este catálogo no tiene variantes detectadas.</p>
          ) : (
            <ul className="mt-3 flex max-h-72 flex-col gap-1 overflow-y-auto">
              {variants.map((variant) => {
                const checked = !excluded.includes(variant.label);
                return (
                  <li key={variant.label}>
                    <label className="flex min-h-11 items-center gap-3 text-sm text-stone-800">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={pending}
                        onChange={() => {
                          const next = checked
                            ? [...excluded, variant.label]
                            : excluded.filter((label) => label !== variant.label);
                          setExcluded(next);
                          persist({ mode, copies, excluded: next });
                        }}
                        className="size-4 accent-stone-900"
                      />
                      <span className="min-w-0 flex-1">{variant.label}</span>
                      <span className="text-xs text-stone-500">{formatCount(variant.cards)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </details>
      ) : null}
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}

function clampCopies(value: string) {
  const copies = Number(value);
  if (!Number.isInteger(copies)) return 2;
  return Math.min(99, Math.max(1, copies));
}
