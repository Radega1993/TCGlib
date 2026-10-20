import {
  CardSet,
  CardSuggestion,
  CatalogFacets,
  CatalogQuery,
  CatalogStats,
  Paginated,
  Product,
} from "@/lib/types";

export function publicApiUrl() {
  return process.env["API_URL"] || "http://localhost:3001";
}

export function serverApiUrl() {
  return process.env["API_INTERNAL_URL"] || publicApiUrl();
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
  ) {
    super(`La API respondió ${status} en ${path}`);
  }
}

export function getApiUrl() {
  return serverApiUrl();
}

export function getProducts(query: CatalogQuery) {
  return apiGet<Paginated<Product>>(
    `/api/products${toQuery({
      tcg: "one-piece",
      type: "card",
      q: query.q,
      set: query.set,
      color: join(query.color),
      rarity: join(query.rarity),
      cardType: join(query.cardType),
      attribute: join(query.attribute),
      cost: join(query.cost),
      sort: query.sort === "set" ? undefined : query.sort,
      page: query.page,
      limit: 24,
    })}`,
  );
}

export function getSuggestions(q: string) {
  return apiGet<{ data: CardSuggestion[] }>(
    `/api/products/suggest${toQuery({ q, limit: 8 })}`,
  );
}

export function getFacets() {
  return apiGet<{ data: CatalogFacets }>("/api/catalog/facets?tcg=one-piece");
}

export function getProduct(externalId: number) {
  return apiGet<{ data: Product }>(`/api/products/${externalId}`);
}

export function getSets() {
  return apiGet<{ data: CardSet[]; total: number }>("/api/sets?tcg=one-piece");
}

export function getStats() {
  return apiGet<{ data: CatalogStats }>("/api/catalog/stats?tcg=one-piece");
}

async function apiGet<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${serverApiUrl()}${path}`, { cache: "no-store" });
  } catch {
    throw new ApiError(0, path);
  }

  if (!response.ok) {
    throw new ApiError(response.status, path);
  }

  return (await response.json()) as T;
}

function join(values: string[]) {
  return values.length ? values.join(",") : undefined;
}

function toQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
