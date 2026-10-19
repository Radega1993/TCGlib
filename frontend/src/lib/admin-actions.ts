"use server";

import { revalidatePath } from "next/cache";
import { serverApiUrl } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export async function updateAdminUser(
  id: string,
  patch: { alias?: string; shareEnabled?: boolean },
) {
  return adminWrite(`/api/admin/users/${encodeURIComponent(id)}`, "PUT", patch);
}

export async function setUserBlocked(id: string, blocked: boolean) {
  return adminWrite(`/api/admin/users/${encodeURIComponent(id)}/block`, "PUT", { blocked });
}

export async function deleteAdminUser(id: string) {
  return adminWrite(`/api/admin/users/${encodeURIComponent(id)}`, "DELETE");
}

async function adminWrite(path: string, method: "PUT" | "DELETE", body?: unknown) {
  const token = await readSessionToken();
  if (!token) return { ok: false as const, error: "La sesión no es válida" };
  const response = await fetch(`${serverApiUrl()}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  }).catch(() => null);
  if (!response) return { ok: false as const, error: "No se pudo conectar con la API" };
  if (!response.ok) {
    return { ok: false as const, error: await readError(response) };
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

async function readError(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;
  const message = body?.message;
  if (Array.isArray(message) && message[0]) return message[0];
  if (typeof message === "string" && message.trim()) return message;
  return "No se pudo completar la acción";
}
