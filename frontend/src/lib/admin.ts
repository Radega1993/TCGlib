import { serverApiUrl } from "@/lib/api";
import { readSessionToken } from "@/lib/session";
import { AdminOverview, AdminUser } from "@/lib/types";

export async function getAdminOverview() {
  return adminGet<AdminOverview>("/api/admin/overview");
}

export async function getAdminUsers(query: { q?: string; page: number }) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.page > 1) params.set("page", String(query.page));
  const search = params.toString();
  return adminGet<{ data: AdminUser[]; total: number; page: number; limit: number }>(
    `/api/admin/users${search ? `?${search}` : ""}`,
    true,
  );
}

async function adminGet<T>(path: string, paginated = false) {
  const token = await readSessionToken();
  if (!token) return null;
  const response = await fetch(`${serverApiUrl()}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!response || response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error("admin");
  if (paginated) return (await response.json()) as T;
  const body = (await response.json()) as { data: T };
  return body.data;
}
