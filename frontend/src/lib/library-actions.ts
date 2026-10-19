"use server";

import { revalidatePath } from "next/cache";
import { readSessionToken } from "@/lib/session";
import { LibraryList } from "@/lib/types";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

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

  const response = await fetch(`${API_URL}/api/me/library`, {
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

  revalidatePath("/perfil", "page");
  revalidatePath(`/products/${externalId}`, "page");
  return { ok: true as const };
}
