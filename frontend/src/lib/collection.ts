import { serverApiUrl } from "@/lib/api";
import { readSessionToken } from "@/lib/session";
import {
  CollectionOverview,
  CollectionSetDetail,
  CollectionView,
} from "@/lib/types";

const VIEWS: CollectionView[] = ["todas", "faltan", "tienes", "repetidas", "deseadas"];

export function collectionView(value: string | undefined): CollectionView {
  return VIEWS.includes(value as CollectionView) ? (value as CollectionView) : "todas";
}

export function collectionPage(value: string | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export async function getCollectionOverview(tcg = "one-piece") {
  const path = tcg === "riftbound" ? "/api/me/collection?tcg=riftbound" : "/api/me/collection";
  return readCollection<CollectionOverview>(path);
}

export async function getCollectionSet(
  externalId: string,
  view: CollectionView,
  page: number,
  tcg = "one-piece",
) {
  const params = new URLSearchParams();
  if (view !== "todas") params.set("view", view);
  if (page > 1) params.set("page", String(page));
  if (tcg === "riftbound") params.set("tcg", tcg);
  const search = params.toString();
  const path = `/api/me/collection/sets/${encodeURIComponent(externalId)}${search ? `?${search}` : ""}`;
  const token = await readSessionToken();
  if (!token) return null;
  const response = await fetch(`${serverApiUrl()}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!response) throw new Error("collection");
  if (response.status === 401) return null;
  if (response.status === 404) return { missing: true as const };
  if (!response.ok) throw new Error("collection");
  const body = (await response.json()) as { data: CollectionSetDetail };
  return { missing: false as const, data: body.data };
}

async function readCollection<T>(path: string) {
  const token = await readSessionToken();
  if (!token) return null;
  const response = await fetch(`${serverApiUrl()}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!response) throw new Error("collection");
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("collection");
  const body = (await response.json()) as { data: T };
  return body.data;
}
