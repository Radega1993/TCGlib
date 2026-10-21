import Image from "next/image";
import Link from "next/link";
import { productHref } from "@/lib/catalog-query";
import { formatCount } from "@/lib/format";
import { LibraryEntry } from "@/lib/types";

export function LibraryAlbum({
  entries,
  returnTo,
  productBase = "/products",
}: {
  entries: LibraryEntry[];
  returnTo: string;
  productBase?: string;
}) {
  return (
    <ul className="grid grid-cols-3 gap-2 lg:grid-cols-4">
      {entries.map((entry) => {
        const forTrade = entry.forTrade ?? 0;
        const copies = entry.quantity === 1 ? "1 copia" : `${formatCount(entry.quantity)} copias`;
        const trade = forTrade > 0 ? `, ${formatCount(forTrade)} en intercambio` : "";
        return (
          <li key={entry.product.externalId}>
            <Link
              href={productHref(entry.product.externalId, returnTo, productBase)}
              aria-label={`${entry.product.name}, ${copies}${trade}`}
              className="relative block overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200"
            >
              <span className="relative block aspect-[63/88]">
                {entry.product.image ? (
                  <Image
                    src={entry.product.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 180px, 33vw"
                    className="object-contain"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-stone-500">
                    {entry.product.name}
                  </span>
                )}
              </span>
              <span className="absolute right-1 bottom-1 rounded-full bg-stone-950/85 px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums">
                {formatCount(entry.quantity)}
              </span>
              {forTrade > 0 ? (
                <span className="absolute top-1 left-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[11px] font-medium text-stone-800 tabular-nums">
                  ↔ {formatCount(forTrade)}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
