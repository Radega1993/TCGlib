"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { serverApiUrl } from "@/lib/api";
import { readSessionToken } from "@/lib/session";
import { DeckDetail, DeckFormat, DeckSearchCard } from "@/lib/types";

export type ImportedDeck = {
  deck: DeckDetail;
  notes: string[];
};

export type DeckDraft = {
  name: string;
  format: DeckFormat;
  leaderCode?: string;
  lines: { code: string; quantity: number }[];
};

export async function createDeck() {
  const result = await request<DeckDetail>("/api/me/decks", "POST", {
    name: "Mazo nuevo",
    format: "extra",
  });
  if (!result.ok) {
    if (result.error === "auth") redirect("/entrar?return=/mazos");
    return;
  }
  revalidatePath("/mazos");
  redirect(`/mazos/${result.data.id}`);
}

export async function importNewDeck(source: string) {
  const result = await request<ImportedDeck>("/api/me/decks/import", "POST", { source });
  if (result.ok) revalidatePath("/mazos");
  return result;
}

export async function importDeckInto(id: string, source: string) {
  const result = await request<ImportedDeck>(`/api/me/decks/${id}/import`, "POST", { source });
  if (result.ok) revalidateDeck(id, result.data.deck.publicSlug);
  return result;
}

export async function previewDeck(id: string, draft: DeckDraft) {
  return request<DeckDetail>(`/api/me/decks/${id}/preview`, "POST", draft);
}

export async function saveDeck(id: string, draft: DeckDraft) {
  const result = await request<DeckDetail>(`/api/me/decks/${id}`, "PUT", draft);
  if (result.ok) revalidateDeck(id, result.data.publicSlug);
  return result;
}

export async function duplicateDeck(id: string) {
  const result = await request<DeckDetail>(`/api/me/decks/${id}/duplicate`, "POST");
  if (!result.ok) return result;
  revalidatePath("/mazos");
  redirect(`/mazos/${result.data.id}`);
}

export async function deleteDeck(id: string) {
  const result = await request<{ deleted: boolean }>(`/api/me/decks/${id}`, "DELETE");
  if (!result.ok) return result;
  revalidatePath("/mazos");
  redirect("/mazos");
}

export async function addDeckMissing(id: string) {
  const result = await request<{ copies: number }>(`/api/me/decks/${id}/wishlist`, "POST");
  if (result.ok) {
    revalidatePath("/deseados");
    revalidatePath(`/mazos/${id}`);
  }
  return result;
}

export async function setDeckShare(id: string, enabled: boolean) {
  const result = await request<{ publicSlug: string | null; shareEnabled: boolean }>(
    `/api/me/decks/${id}/share`,
    "PUT",
    { enabled },
  );
  if (result.ok) revalidateDeck(id, result.data.publicSlug);
  return result;
}

export async function resetDeckShare(id: string) {
  const result = await request<{ publicSlug: string; shareEnabled: boolean }>(
    `/api/me/decks/${id}/share/reset`,
    "POST",
  );
  if (result.ok) revalidateDeck(id, result.data.publicSlug);
  return result;
}

export async function searchDeckCards(q: string, role: "leader" | "card") {
  const params = new URLSearchParams({ q, role });
  return request<DeckSearchCard[]>(`/api/me/decks/search?${params}`, "GET");
}

function revalidateDeck(id: string, slug?: string | null) {
  revalidatePath("/mazos");
  revalidatePath(`/mazos/${id}`);
  if (slug) revalidatePath(`/mazo/${slug}`);
}

async function request<T>(path: string, method: "GET" | "POST" | "PUT" | "DELETE", body?: unknown) {
  const token = await readSessionToken();
  if (!token) return { ok: false as const, error: "auth" as const };
  const response = await fetch(`${serverApiUrl()}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  }).catch(() => null);
  if (!response) return { ok: false as const };
  if (response.status === 401) return { ok: false as const, error: "auth" as const };
  if (!response.ok) return { ok: false as const, message: await errorMessage(response) };
  const payload = (await response.json()) as { data: T };
  return { ok: true as const, data: payload.data };
}

async function errorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;
  const message = payload?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}
