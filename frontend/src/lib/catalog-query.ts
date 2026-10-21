import { CatalogQuery, CatalogSort, LibraryList, ShareQuery, ShareTab } from "@/lib/types";

const LIST_LIMIT = {
  color: 8,
  rarity: 12,
  cardType: 8,
  attribute: 8,
  cost: 12,
} as const;

export function parseCatalogQuery(
  raw: Record<string, string | string[] | undefined>,
): CatalogQuery {
  const page = Number(first(raw.page) ?? 1);
  const q = first(raw.q)?.trim();
  const set = first(raw.set)?.trim();

  return {
    q: q || undefined,
    set: set || undefined,
    color: list(raw.color, LIST_LIMIT.color),
    rarity: list(raw.rarity, LIST_LIMIT.rarity),
    cardType: list(raw.cardType, LIST_LIMIT.cardType),
    attribute: list(raw.attribute, LIST_LIMIT.attribute),
    cost: list(raw.cost, LIST_LIMIT.cost),
    sort: catalogSort(first(raw.sort)),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function catalogHref(query: CatalogQuery, page = query.page, base = "/") {
  const params = filterParams(query, page);
  const search = params.toString();
  if (!search) return base;
  return base === "/" ? `/?${search}` : `${base}?${search}`;
}

export function parseShareQuery(
  raw: Record<string, string | string[] | undefined>,
): ShareQuery {
  return {
    ...parseCatalogQuery(raw),
    tab: shareTab(first(raw.tab)),
    view: first(raw.vista) === "lista" ? "list" : "album",
  };
}

export function shareHref(
  slug: string,
  query: ShareQuery,
  game: "one-piece" | "riftbound" = "one-piece",
) {
  const params = filterParams(query, query.page);
  if (query.tab) params.set("tab", query.tab);
  if (query.view === "list") params.set("vista", "lista");
  const path = game === "riftbound" ? `/u/${slug}/riftbound` : `/u/${slug}`;
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export function libraryHref(
  list: LibraryList,
  query: CatalogQuery,
  page = query.page,
  base = "",
) {
  const params = filterParams(query, page);
  const path = `${base}${list === "wanted" ? "/deseados" : "/biblioteca"}`;
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export function libraryApiQuery(
  list: LibraryList,
  query?: CatalogQuery,
  tcg = "one-piece",
) {
  const params = query ? filterParams(query, query.page) : new URLSearchParams();
  params.set("list", list);
  if (tcg === "riftbound") params.set("tcg", tcg);
  return params;
}

function shareTab(value: string | undefined): ShareTab | undefined {
  if (value === "biblioteca" || value === "intercambio" || value === "busco") return value;
  return undefined;
}

export function sameFilters(left: CatalogQuery, right: CatalogQuery) {
  return (
    left.q === right.q &&
    left.set === right.set &&
    sameList(left.color, right.color) &&
    sameList(left.rarity, right.rarity) &&
    sameList(left.cardType, right.cardType) &&
    sameList(left.attribute, right.attribute) &&
    sameList(left.cost, right.cost) &&
    left.sort === right.sort
  );
}

function filterParams(query: CatalogQuery, page: number) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.set) params.set("set", query.set);
  setList(params, "color", query.color);
  setList(params, "rarity", query.rarity);
  setList(params, "cardType", query.cardType);
  setList(params, "attribute", query.attribute);
  setList(params, "cost", query.cost);
  if (query.sort && query.sort !== "set") params.set("sort", query.sort);
  if (page > 1) params.set("page", String(page));
  return params;
}

function sameList(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function activeFilterCount(query: CatalogQuery) {
  return (
    query.color.length +
    query.rarity.length +
    query.cardType.length +
    query.attribute.length +
    query.cost.length +
    (query.set ? 1 : 0) +
    (query.q ? 1 : 0)
  );
}

export function productHref(externalId: number, returnTo: string, productBase = "/products") {
  const params = new URLSearchParams();
  if (returnTo !== "/" && returnTo !== productBase) params.set("return", returnTo);
  const search = params.toString();
  const path = `${productBase}/${externalId}`;
  return search ? `${path}?${search}` : path;
}

export function safeNextPath(value: string | undefined, fallback = "/biblioteca") {
  if (!value || value.length > 300) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("://") || /[\s\\]/.test(value)) return fallback;
  if (value.startsWith("/entrar") || value.startsWith("/api")) return fallback;
  return value;
}

export function safeReturn(value: string | undefined, fallback = "/") {
  return safeNextPath(value, fallback);
}

function setList(params: URLSearchParams, key: string, values: string[]) {
  if (values.length) params.set(key, values.join(","));
}

function list(value: string | string[] | undefined, max: number) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return [
    ...new Set(
      raw
        .flatMap((item) => item.split(","))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, max);
}

function catalogSort(value: string | undefined): CatalogSort {
  if (value === "color" || value === "rarity" || value === "set") return value;
  return "set";
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
