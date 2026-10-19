import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardLibraryActions } from "@/components/card-library-actions";
import { ApiError, getProduct } from "@/lib/api";
import { safeReturn } from "@/lib/catalog-query";
import { getCardCounts, getCurrentUser } from "@/lib/session";
import {
  colorClass,
  sanitizeCardHtml,
  splitColors,
  typeLabel,
} from "@/lib/format";

export async function ProductView({
  params,
  searchParams,
}: {
  params: Promise<{ externalId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ externalId }, query] = await Promise.all([params, searchParams]);
  const id = Number(externalId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const returnTo = safeReturn(first(query.return));
  let product;
  try {
    product = (await getProduct(id)).data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  if (product.type !== "card") notFound();

  const user = await getCurrentUser();
  const library = user
    ? await getCardCounts(product.externalId)
    : { owned: 0, wanted: 0, forTrade: 0 };
  const image = product.images[0]?.large ?? product.images[0]?.medium;
  const description = product.attributes.Description;
  const attributeEntries = Object.entries(product.attributes).filter(
    ([key]) => key !== "Description",
  );
  const tcgplayer = product.markets?.tcgplayer;

  return (
    <article className="flex flex-col gap-6">
      <Link
        href={returnTo}
        className="inline-flex h-11 items-center text-sm font-medium text-stone-700"
      >
        ← Volver al catálogo
      </Link>
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="relative mx-auto aspect-[63/88] w-full max-w-xs overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200 lg:mx-0">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 80vw, 288px"
              className="object-contain"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-sm text-stone-400">
              Sin imagen
            </span>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-stone-500">
              {typeLabel(product.type)}
              {product.set.code ? ` · ${product.set.code}` : ""} · id {product.externalId}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">
              {product.name}
            </h1>
            <p className="mt-1 text-sm text-stone-600">{product.set.name}</p>
          </div>
          <CardLibraryActions
            externalId={product.externalId}
            owned={library?.owned ?? 0}
            wanted={library?.wanted ?? 0}
            forTrade={library?.forTrade ?? 0}
            loggedIn={user !== null}
          />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Código" value={product.code} />
            <Field label="Rareza" value={product.rarity} />
            <Field label="Tipo de carta" value={product.cardType} />
            <Field label="Coste" value={product.cost} />
            <Field label="Poder" value={product.power} />
            <Field label="Vida" value={product.life} />
            <Field label="Atributo" value={product.cardAttribute} />
            <Field label="Artista" value={product.artist} />
            <div className="col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Color
              </dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {splitColors(product.color).length === 0 ? (
                  <span className="text-stone-800">—</span>
                ) : (
                  splitColors(product.color).map((color) => (
                    <span
                      key={color}
                      className="inline-flex items-center gap-1.5 text-stone-800"
                    >
                      <span className={`size-2.5 rounded-full ${colorClass(color)}`} />
                      {color}
                    </span>
                  ))
                )}
              </dd>
            </div>
            <Field label="Subtipos" value={product.subtypes} wide />
          </dl>
          {description ? (
            <div
              className="text-sm leading-6 text-stone-800 [&_em]:text-stone-600"
              dangerouslySetInnerHTML={{ __html: sanitizeCardHtml(description) }}
            />
          ) : null}
        </div>
      </div>

      {tcgplayer?.url ? (
        <p className="text-sm text-stone-700">
          Para consultar el precio, ir a{" "}
          <a
            href={tcgplayer.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-rose-800 underline-offset-4 hover:underline"
          >
            TCGplayer
          </a>
          .
        </p>
      ) : null}

      {attributeEntries.length > 0 ? (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
          <h2 className="text-sm font-semibold text-stone-900">Atributos</h2>
          <dl className="mt-3 divide-y divide-stone-100">
            {attributeEntries.map(([key, value]) => (
              <div
                key={key}
                className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4"
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  {key}
                </dt>
                <dd className="text-sm break-words text-stone-800">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </article>
  );
}

function Field({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </dt>
      <dd className="mt-1 text-stone-900">{value || "—"}</dd>
    </div>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
