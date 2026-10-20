"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLibraryLayout } from "@/lib/library-actions";

export type LibraryLayout = "list" | "album";

const OPTIONS: { id: LibraryLayout; label: string }[] = [
  { id: "list", label: "Lista" },
  { id: "album", label: "Álbum" },
];

export function LibraryViewToggle({ view }: { view: LibraryLayout }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: LibraryLayout) {
    if (next === view || pending) return;
    startTransition(async () => {
      await setLibraryLayout(next);
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 rounded-xl bg-white p-1 ring-1 ring-stone-200" role="group" aria-label="Vista de la biblioteca">
      {OPTIONS.map((option) => {
        const selected = option.id === view;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            disabled={pending}
            onClick={() => choose(option.id)}
            className={`inline-flex h-11 items-center rounded-lg px-3 text-sm font-medium ${
              selected ? "bg-stone-900 text-white" : "text-stone-600"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
