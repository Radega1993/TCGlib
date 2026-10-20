import { cookies } from "next/headers";
import { cache } from "react";
import { serverApiUrl } from "@/lib/api";
import { libraryApiQuery, shareHref } from "@/lib/catalog-query";
import {
  CardSet,
  CatalogFacets,
  CatalogQuery,
  LibraryCounts,
  LibraryEntry,
  LibraryList,
  PublicUser,
  SharedCollection,
  ShareQuery,
} from "@/lib/types";

export const SESSION_COOKIE = "tcglib_session";

export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const token = await readSessionToken();
  if (!token) return null;
  const response = await fetch(`${serverApiUrl()}/api/me`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return null;
  const body = (await response.json()) as { data: PublicUser };
  return body.data;
});

export async function getAuthStatus() {
  const response = await fetch(`${serverApiUrl()}/api/auth/status`, {
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return { google: false, online: false };
  const body = (await response.json()) as { data?: { google?: boolean } };
  return { google: Boolean(body.data?.google), online: true };
}

export async function getLibrary(list: LibraryList, query?: CatalogQuery) {
  const token = await readSessionToken();
  if (!token) return null;
  const response = await fetch(
    `${serverApiUrl()}/api/me/library?${libraryApiQuery(list, query)}`,
    {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("library");
  return (await response.json()) as {
    data: LibraryEntry[];
    total: number;
    copies: number;
    page: number;
    limit: number;
    list: LibraryList;
    counts: LibraryCounts;
    facets: CatalogFacets;
    sets: CardSet[];
  };
}

export async function getTrades(page = 1) {
  const token = await readSessionToken();
  if (!token) return null;
  const params = new URLSearchParams();
  params.set("list", "trade");
  if (page > 1) params.set("page", String(page));
  const response = await fetch(`${serverApiUrl()}/api/me/library?${params}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!response) throw new Error("library");
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("library");
  return (await response.json()) as {
    data: (LibraryEntry & { wanted: number })[];
    total: number;
    page: number;
    limit: number;
    counts: LibraryCounts;
  };
}

export async function getSharedCollection(slug: string, query: ShareQuery) {
  const href = shareHref(slug, { ...query, view: undefined });
  const search = href.includes("?") ? href.slice(href.indexOf("?")) : "";
  const response = await fetch(
    `${serverApiUrl()}/api/share/${encodeURIComponent(slug)}${search}`,
    { cache: "no-store" },
  ).catch(() => null);
  if (!response || response.status === 404) return null;
  if (!response.ok) throw new Error("share");
  const body = (await response.json()) as { data: SharedCollection };
  return body.data;
}

export async function getCardCounts(externalId: number) {
  const token = await readSessionToken();
  if (!token) return null;
  const response = await fetch(`${serverApiUrl()}/api/me/library/card/${externalId}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return { owned: 0, wanted: 0, forTrade: 0 };
  const body = (await response.json()) as {
    data: { owned: number; wanted: number; forTrade: number };
  };
  return body.data;
}

export async function readSessionToken() {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value;
}
