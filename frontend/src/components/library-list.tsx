import Image from "next/image";
import Link from "next/link";
import { LibraryQuantity } from "@/components/library-quantity";
import { productHref } from "@/lib/catalog-query";
import { colorClass, formatCount, splitColors } from "@/lib/format";
import { LibraryEntry, type LibraryList } from "@/lib/types";

export function LibraryList({
  entries,
  list,
  readOnly = false,
  returnTo = list === "wanted" ? "/deseados" : "/biblioteca",
  copiesLabel,
}: {
  entries: LibraryEntry[];
  list: LibraryList;
  readOnly?: boolean;
  returnTo?: string;
  copiesLabel?: (quantity: number) => string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl bg-white px-4 py-10 text-center ring-1 ring-stone-200">
        <p className="text-sm text-stone-700">
          {list === "owned"
            ? readOnly
              ? "Esta biblioteca no tiene cartas."
              : "Todavía no has guardado cartas en tu biblioteca."
            : readOnly
              ? "Esta lista de deseos está vacía."
              : "No estás buscando ninguna carta."}
        </p>
        {readOnly ? null : (
          <>
            <p className="mt-1 text-sm text-stone-500">
              Abre una carta del catálogo y ajusta {list === "owned" ? "Tengo" : "Busco"}.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex h-11 items-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white"
            >
              Ir al catálogo
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry) => {
        const colors = splitColors(entry.product.color);
        const forTrade = entry.forTrade ?? 0;
        const reserved = Math.max(0, entry.quantity - forTrade);
        return (
          <li
            key={entry.product.externalId}
            className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-200"
          >
            <Link
              href={productHref(entry.product.externalId, returnTo)}
              className="relative block h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100"
            >
              {entry.product.image ? (
                <Image
                  src={entry.product.image}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-contain"
                />
              ) : null}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div>
                <Link
                  href={productHref(entry.product.externalId, returnTo)}
                  className="line-clamp-2 text-sm font-medium text-stone-950"
                >
                  {entry.product.name}
                </Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                  <span>
                    {entry.product.code ?? "Carta"}
                    {entry.product.set.code ? ` · ${entry.product.set.code}` : ""}
                  </span>
                  {entry.product.rarity ? <span>· {entry.product.rarity}</span> : null}
                  {colors.map((color) => (
                    <span
                      key={color}
                      title={color}
                      className={`size-2.5 rounded-full ${colorClass(color)}`}
                    />
                  ))}
                </p>
              </div>
              {readOnly ? (
                <p className="text-sm font-medium text-stone-800">
                  {copiesLabel
                    ? copiesLabel(entry.quantity)
                    : `${entry.quantity} ${entry.quantity === 1 ? "copia" : "copias"}`}
                  {!copiesLabel && list === "owned" && (entry.forTrade ?? 0) > 0
                    ? ` · ${entry.forTrade} para intercambio`
                    : ""}
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {list === "owned" ? (
                    <p className="text-sm font-medium text-stone-800">
                      En biblioteca {formatCount(entry.quantity)}
                      {forTrade > 0
                        ? ` · Reservadas ${formatCount(reserved)} · Intercambio ${formatCount(forTrade)}`
                        : ""}
                    </p>
                  ) : null}
                  <LibraryQuantity
                    externalId={entry.product.externalId}
                    list={list}
                    quantity={entry.quantity}
                  />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
