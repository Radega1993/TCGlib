"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QuantityStepper } from "@/components/quantity-stepper";
import { setCardQuantity } from "@/lib/library-actions";

export function CardLibraryActions({
  externalId,
  owned,
  wanted,
  loggedIn,
}: {
  externalId: number;
  owned: number;
  wanted: number;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [counts, setCounts] = useState({ owned, wanted });
  const [seen, setSeen] = useState(`${owned}:${wanted}`);
  const key = `${owned}:${wanted}`;
  if (seen !== key) {
    setSeen(key);
    setCounts({ owned, wanted });
  }

  if (!loggedIn) {
    const back = encodeURIComponent(`/products/${externalId}`);
    return (
      <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
        <h2 className="text-sm font-semibold text-stone-900">Tu biblioteca</h2>
        <p className="mt-1 text-sm text-stone-600">
          Entra con Google para guardar cuántas copias tienes y cuántas estás buscando.
        </p>
        <Link
          href={`/entrar?return=${back}`}
          className="mt-3 inline-flex h-11 items-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white"
        >
          Continuar con Google
        </Link>
      </section>
    );
  }

  function change(list: "owned" | "wanted", quantity: number) {
    const previous = counts;
    setCounts((current) => ({ ...current, [list]: quantity }));
    startTransition(async () => {
      const result = await setCardQuantity(externalId, list, quantity);
      if (!result.ok) {
        setCounts(previous);
        if (result.error === "auth") {
          router.push(`/entrar?return=${encodeURIComponent(`/products/${externalId}`)}`);
        }
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <h2 className="text-sm font-semibold text-stone-900">Tu biblioteca</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <QuantityStepper
          label="Tengo"
          value={counts.owned}
          pending={isPending}
          onChange={(quantity) => change("owned", quantity)}
        />
        <QuantityStepper
          label="Busco"
          value={counts.wanted}
          pending={isPending}
          onChange={(quantity) => change("wanted", quantity)}
        />
      </div>
    </section>
  );
}
