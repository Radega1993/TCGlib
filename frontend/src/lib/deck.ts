import { serverApiUrl } from "@/lib/api";
import { readSessionToken } from "@/lib/session";
import {
  DeckDetail,
  DeckListItem,
  PublicDeck,
  SuggestedDeckDetail,
  SuggestedDeckMatch,
} from "@/lib/types";

export async function getDecks() {
  return authed<DeckListItem[]>("/api/me/decks");
}

export async function getSuggestions() {
  return authed<SuggestedDeckMatch[]>("/api/me/decks/suggestions");
}

export async function getSuggestion(slug: string) {
  return authed<SuggestedDeckDetail>(`/api/me/decks/suggestions/${encodeURIComponent(slug)}`);
}

export async function getDeck(id: string) {
  return authed<DeckDetail>(`/api/me/decks/${id}`);
}

export async function getPublicDeck(slug: string) {
  const response = await fetch(`${serverApiUrl()}/api/decks/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  }).catch(() => null);
  if (!response) throw new Error("down");
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("down");
  const body = (await response.json()) as { data: PublicDeck };
  return body.data;
}

async function authed<T>(path: string) {
  const token = await readSessionToken();
  if (!token) return null;
  const response = await fetch(`${serverApiUrl()}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!response) throw new Error("down");
  if (response.status === 401) return null;
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("down");
  const body = (await response.json()) as { data: T };
  return body.data;
}
