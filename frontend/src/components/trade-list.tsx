"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QuantityStepper } from "@/components/quantity-stepper";
import { productHref } from "@/lib/catalog-query";
import { formatCount } from "@/lib/format";
import { setCardForTrade } from "@/lib/library-actions";
import { LibraryEntry } from "@/lib/types";

export function TradeList({
  entries,
  returnTo = "/intercambio",
  productBase = "/products",
}: {
  entries: { entry: LibraryEntry; wanted: number }[];
  returnTo?: string;
  productBase?: string;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {entries.map(({ entry, wanted }) => (
        <TradeRow
          key={entry.product.externalId}
          entry={entry}
          wanted={wanted}
          returnTo={returnTo}
          productBase={productBase}
        />
      ))}
    </ul>
  );
}

function TradeRow({
  entry,
  wanted,
  returnTo,
  productBase,
}: {
  entry: LibraryEntry;
  wanted: number;
  returnTo: string;
  productBase: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(entry.forTrade ?? 0);
  const [seen, setSeen] = useState(entry.forTrade ?? 0);
  const [error, setError] = useState<string | null>(null);
  if (seen !== (entry.forTrade ?? 0)) {
    setSeen(entry.forTrade ?? 0);
    setValue(entry.forTrade ?? 0);
  }

  const reserved = Math.max(0, entry.quantity - value);
  const href = productHref(entry.product.externalId, returnTo, productBase);

  function change(next: number) {
    const previous = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      const result = await setCardForTrade(entry.product.externalId, next);
      if (!result.ok) {
        setValue(previous);
        if (result.error === "auth") {
          router.push("/entrar?return=%2Fintercambio");
          return;
        }
        setError(typeof result.error === "string" ? result.error : "No se pudo guardar.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-200">
      <Link href={href} className="relative block h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
        {entry.product.image ? (
          <Image src={entry.product.image} alt="" fill sizes="64px" className="object-contain" />
        ) : null}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <Link href={href} className="line-clamp-2 text-sm font-medium text-stone-950">
            {entry.product.name}
          </Link>
          <p className="mt-0.5 text-xs text-stone-500">
            {entry.product.code ?? "Carta"}
            {entry.product.set.code ? ` · ${entry.product.set.code}` : ""}
          </p>
        </div>
        <p className="text-sm text-stone-700">
          Biblioteca {formatCount(entry.quantity)} · Reservadas {formatCount(reserved)} · Deseadas{" "}
          {formatCount(wanted)}
        </p>
        <QuantityStepper
          label="Disponibles"
          value={value}
          max={entry.quantity}
          pending={pending}
          onChange={change}
        />
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>
    </li>
  );
}
