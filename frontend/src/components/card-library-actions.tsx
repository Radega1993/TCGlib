"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QuantityStepper } from "@/components/quantity-stepper";
import { setCardForTrade, setCardQuantity } from "@/lib/library-actions";
import { formatCount } from "@/lib/format";

export function CardLibraryActions({
  externalId,
  owned,
  wanted,
  forTrade,
  loggedIn,
}: {
  externalId: number;
  owned: number;
  wanted: number;
  forTrade: number;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ owned, wanted, forTrade });
  const [seen, setSeen] = useState(`${owned}:${wanted}:${forTrade}`);
  const key = `${owned}:${wanted}:${forTrade}`;
  if (seen !== key) {
    setSeen(key);
    setCounts({ owned, wanted, forTrade });
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

  const reserved = Math.max(0, counts.owned - counts.forTrade);

  function changeOwned(quantity: number) {
    const previous = counts;
    setError(null);
    setCounts((current) => ({
      ...current,
      owned: quantity,
      forTrade: Math.min(current.forTrade, quantity),
    }));
    startTransition(async () => {
      const result = await setCardQuantity(externalId, "owned", quantity);
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

  function changeWanted(quantity: number) {
    const previous = counts;
    setError(null);
    setCounts((current) => ({ ...current, wanted: quantity }));
    startTransition(async () => {
      const result = await setCardQuantity(externalId, "wanted", quantity);
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

  function changeTrade(quantity: number) {
    const previous = counts;
    setError(null);
    setCounts((current) => ({ ...current, forTrade: quantity }));
    startTransition(async () => {
      const result = await setCardForTrade(externalId, quantity);
      if (!result.ok) {
        setCounts(previous);
        if (result.error === "auth") {
          router.push(`/entrar?return=${encodeURIComponent(`/products/${externalId}`)}`);
          return;
        }
        setError(
          typeof result.error === "string"
            ? result.error
            : "No se pudo guardar el intercambio.",
        );
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <h2 className="text-sm font-semibold text-stone-900">Tu biblioteca</h2>
      <div className="mt-3 flex flex-col gap-2">
        <QuantityStepper
          label="Tengo"
          value={counts.owned}
          pending={isPending}
          onChange={changeOwned}
        />
        <QuantityStepper
          label="Busco"
          value={counts.wanted}
          pending={isPending}
          onChange={changeWanted}
        />
        <QuantityStepper
          label="Intercambio"
          value={counts.forTrade}
          max={counts.owned}
          pending={isPending || counts.owned === 0}
          onChange={changeTrade}
        />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Count label="Biblioteca" value={counts.owned} />
        <Count label="Reservadas" value={reserved} />
        <Count label="Disponibles para intercambio" value={counts.forTrade} />
        <Count label="Deseadas" value={counts.wanted} />
      </dl>
      <p className="mt-3 text-xs leading-5 text-stone-500">
        Las copias para intercambio se marcan a mano. El resto se queda reservado.
      </p>
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-2">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums text-stone-950">{formatCount(value)}</dd>
    </div>
  );
}
