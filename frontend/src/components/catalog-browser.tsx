import { ApiError, getFacets, getProducts, getSets, getStats } from "@/lib/api";
import { catalogHref, parseCatalogQuery, productHref } from "@/lib/catalog-query";
import { formatCount } from "@/lib/format";
import {
  CardSet,
  CatalogFacets,
  CatalogQuery,
  CatalogStats,
  Paginated,
  Product,
} from "@/lib/types";
import { Filters } from "@/components/filters";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";

export async function CatalogBrowser({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseCatalogQuery(await searchParams);

  const loaded = await loadCatalog(query);
  if (loaded.error) {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        {loaded.error === "offline"
          ? "No se pudo conectar con la API en el puerto 3001. Arranca el backend y vuelve a cargar."
          : "La API no pudo devolver el catálogo."}
      </p>
    );
  }

  const { products, sets, stats, facets } = loaded;
  const returnTo = catalogHref(query);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-600">
        {formatCount(stats.data.cards)} cartas · {formatCount(stats.data.sets)} sets
      </p>
      <Filters sets={sets.data} facets={facets.data} query={query} />
      <p className="text-sm text-stone-700">
        {formatCount(products.total)} {products.total === 1 ? "carta" : "cartas"}
        {query.q ? ` para “${query.q}”` : ""}
      </p>
      {products.data.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-stone-600 ring-1 ring-stone-200">
          Ninguna carta coincide con estos filtros.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.data.map((product) => (
            <li key={product.externalId}>
              <ProductCard
                product={product}
                href={productHref(product.externalId, returnTo)}
              />
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={products.page}
        total={products.total}
        limit={products.limit}
        hrefFor={(page) => catalogHref(query, page)}
      />
    </div>
  );
}

async function loadCatalog(query: CatalogQuery): Promise<
  | {
      error: null;
      products: Paginated<Product>;
      sets: { data: CardSet[]; total: number };
      stats: { data: CatalogStats };
      facets: { data: CatalogFacets };
    }
  | { error: "offline" | "failed" }
> {
  try {
    const [products, sets, stats, facets] = await Promise.all([
      getProducts(query),
      getSets(),
      getStats(),
      getFacets(),
    ]);
    return { products, sets, stats, facets, error: null };
  } catch (error) {
    return {
      error: error instanceof ApiError && error.status === 0 ? "offline" : "failed",
    };
  }
}

export function CatalogSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="h-5 w-56 rounded bg-stone-200" />
      <div className="h-40 rounded-2xl bg-stone-200" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="aspect-[63/88] rounded-2xl bg-stone-200" />
        ))}
      </div>
    </div>
  );
}
