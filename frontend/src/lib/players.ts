import { serverApiUrl } from "@/lib/api";

export type PublicPlayer = {
  name: string;
  picture?: string;
  slug: string;
  owned: number;
  trades: number;
  wanted: number;
};

export async function getPlayers(query: { q?: string; page: number }) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.page > 1) params.set("page", String(query.page));
  const search = params.toString();
  const response = await fetch(`${serverApiUrl()}/api/players${search ? `?${search}` : ""}`, {
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) throw new Error("players");
  return (await response.json()) as {
    data: PublicPlayer[];
    total: number;
    page: number;
    limit: number;
  };
}
