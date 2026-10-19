import Image from "next/image";
import Link from "next/link";
import { colorClass, splitColors, typeLabel } from "@/lib/format";
import { Product } from "@/lib/types";

export function ProductCard({
  product,
  href,
}: {
  product: Product;
  href: string;
}) {
  const image = product.images[0]?.medium ?? product.images[0]?.small;

  return (
    <Link
      href={href}
      className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200 transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[63/88] bg-stone-100">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 20vw"
            className="object-contain"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center px-3 text-center text-xs text-stone-400">
            Sin imagen
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
        <p className="line-clamp-2 text-sm leading-5 font-medium text-stone-900">
          {product.name}
        </p>
        <p className="text-xs text-stone-500">
          {product.code ?? typeLabel(product.type)}
          {product.set.code ? ` · ${product.set.code}` : ""}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
          {product.rarity ? (
            <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-700">
              {product.rarity}
            </span>
          ) : null}
          {splitColors(product.color).map((color) => (
            <span
              key={color}
              title={color}
              className={`size-2.5 rounded-full ${colorClass(color)}`}
            />
          ))}
        </div>
      </div>
    </Link>
  );
}
