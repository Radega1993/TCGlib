"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QuantityStepper } from "@/components/quantity-stepper";
import { setCardQuantity } from "@/lib/library-actions";
import { LibraryList } from "@/lib/types";

export function LibraryQuantity({
  externalId,
  list,
  quantity,
}: {
  externalId: number;
  list: LibraryList;
  quantity: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(quantity);
  const [seen, setSeen] = useState(quantity);
  if (seen !== quantity) {
    setSeen(quantity);
    setValue(quantity);
  }

  function change(next: number) {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await setCardQuantity(externalId, list, next);
      if (!result.ok) {
        setValue(previous);
        if (result.error === "auth") router.push("/entrar?return=/perfil");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <QuantityStepper
        label="Cantidad"
        value={value}
        pending={isPending}
        onChange={change}
      />
      {value > 0 ? (
        <button
          type="button"
          onClick={() => change(0)}
          disabled={isPending}
          className="self-start text-sm font-medium text-stone-500 underline-offset-4 hover:underline disabled:text-stone-300"
        >
          Quitar
        </button>
      ) : null}
    </div>
  );
}
