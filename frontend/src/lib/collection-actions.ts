"use server";

import { revalidatePath } from "next/cache";
import { serverApiUrl } from "@/lib/api";
import { readSessionToken } from "@/lib/session";
import { CollectionGoal, CollectionMode } from "@/lib/types";

const MODES: CollectionMode[] = ["base", "master", "playset", "custom"];

export async function saveCollectionGoal(input: CollectionGoal) {
  if (!MODES.includes(input.mode)) return { ok: false as const };
  if (!Number.isInteger(input.customCopies) || input.customCopies < 1 || input.customCopies > 99) {
    return { ok: false as const };
  }
  const excludedVariants = [...new Set(input.excludedVariants.map((label) => label.trim()).filter(Boolean))].slice(0, 200);
  const response = await request("/api/me/collection/goal", "PUT", {
    mode: input.mode,
    customCopies: input.customCopies,
    excludedVariants,
  });
  if (!response) return { ok: false as const };
  revalidatePath("/progreso", "layout");
  return { ok: true as const };
}

export async function addMissingToWishlist(externalId: string) {
  if (!/^[a-z0-9-]{1,120}$/.test(externalId)) return { ok: false as const };
  const response = await request(`/api/me/collection/sets/${externalId}/wishlist`, "POST");
  if (!response) return { ok: false as const };
  const body = (await response.json().catch(() => null)) as { data?: { added?: number } } | null;
  revalidatePath("/progreso", "layout");
  revalidatePath("/deseados", "page");
  return { ok: true as const, added: body?.data?.added ?? 0 };
}

async function request(path: string, method: "PUT" | "POST", body?: unknown) {
  const token = await readSessionToken();
  if (!token) return null;
  const response = await fetch(`${serverApiUrl()}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return null;
  return response;
}
