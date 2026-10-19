"use server";

import { revalidatePath } from "next/cache";
import { serverApiUrl } from "@/lib/api";
import { readSessionToken } from "@/lib/session";
import { LibraryList } from "@/lib/types";

export async function setCardQuantity(
  externalId: number,
  list: LibraryList,
  quantity: number,
) {
  if (!Number.isInteger(externalId) || externalId <= 0) return { ok: false as const };
  if (list !== "owned" && list !== "wanted") return { ok: false as const };
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
    return { ok: false as const };
  }

  const token = await readSessionToken();
  if (!token) return { ok: false as const, error: "auth" as const };

  const response = await fetch(`${serverApiUrl()}/api/me/library`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ externalId, list, quantity }),
    cache: "no-store",
  }).catch(() => null);

  if (!response) return { ok: false as const };
  if (response.status === 401) return { ok: false as const, error: "auth" as const };
  if (!response.ok) return { ok: false as const };

  revalidatePath("/biblioteca", "page");
  revalidatePath("/deseados", "page");
  revalidatePath(`/products/${externalId}`, "page");
  return { ok: true as const };
}

export async function setShareEnabled(enabled: boolean) {
  return shareRequest("/api/me/share", "PUT", { enabled });
}

export async function resetShareLink() {
  return shareRequest("/api/me/share/reset", "POST");
}

async function shareRequest(path: string, method: "PUT" | "POST", body?: unknown) {
  const token = await readSessionToken();
  if (!token) return { ok: false as const, error: "auth" as const };
  const response = await fetch(`${serverApiUrl()}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  }).catch(() => null);
  if (!response) return { ok: false as const };
  if (response.status === 401) return { ok: false as const, error: "auth" as const };
  if (!response.ok) return { ok: false as const };
  const payload = (await response.json()) as {
    data: { publicSlug?: string; shareEnabled: boolean };
  };
  revalidatePath("/", "layout");
  return { ok: true as const, data: payload.data };
}
