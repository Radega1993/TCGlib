"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
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

  revalidateLibrary(externalId);
  return { ok: true as const };
}

export async function setCardForTrade(externalId: number, forTrade: number) {
  if (!Number.isInteger(externalId) || externalId <= 0) return { ok: false as const };
  if (!Number.isInteger(forTrade) || forTrade < 0 || forTrade > 99) {
    return { ok: false as const };
  }

  const token = await readSessionToken();
  if (!token) return { ok: false as const, error: "auth" as const };

  const response = await fetch(`${serverApiUrl()}/api/me/library/trade`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ externalId, forTrade }),
    cache: "no-store",
  }).catch(() => null);

  if (!response) return { ok: false as const };
  if (response.status === 401) return { ok: false as const, error: "auth" as const };
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    return { ok: false as const, error: message || ("save" as const) };
  }

  revalidateLibrary(externalId);
  return { ok: true as const };
}

function revalidateLibrary(externalId: number) {
  revalidatePath("/biblioteca", "page");
  revalidatePath("/deseados", "page");
  revalidatePath("/intercambio", "page");
  revalidatePath("/progreso", "layout");
  revalidatePath(`/products/${externalId}`, "page");
}

export async function setShareEnabled(enabled: boolean) {
  return shareRequest("/api/me/share", "PUT", { enabled });
}

export async function resetShareLink() {
  return shareRequest("/api/me/share/reset", "POST");
}

export async function setLibraryLayout(layout: "list" | "album") {
  if (layout !== "list" && layout !== "album") return;
  const jar = await cookies();
  jar.set("tcglib_library_view", layout, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
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
    data: {
      publicSlug?: string;
      wantedSlug?: string;
      tradeSlug?: string;
      shareEnabled: boolean;
    };
  };
  revalidatePath("/", "layout");
  return { ok: true as const, data: payload.data };
}
