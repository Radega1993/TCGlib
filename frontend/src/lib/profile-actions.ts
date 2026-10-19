"use server";

import { revalidatePath } from "next/cache";
import { serverApiUrl } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export async function setAlias(alias: string) {
  const token = await readSessionToken();
  if (!token) return { ok: false as const, error: "La sesión no es válida" };
  const response = await fetch(`${serverApiUrl()}/api/me/alias`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ alias }),
    cache: "no-store",
  }).catch(() => null);
  if (!response) return { ok: false as const, error: "No se pudo conectar con la API" };
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = body?.message;
    const error = Array.isArray(message) ? message[0] : message;
    return { ok: false as const, error: error || "No se pudo guardar el alias" };
  }
  revalidatePath("/", "layout");
  return { ok: true as const };
}
